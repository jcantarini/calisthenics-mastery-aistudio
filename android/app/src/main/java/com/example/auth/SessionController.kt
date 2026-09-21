package com.example.auth

import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import java.security.MessageDigest
import java.security.SecureRandom

/** SDK performs token exchange/refresh. This coordinator owns app state and stale-result fencing. */
class SessionController(
  private val gateway: AuthGateway?, private val vault: SessionVault,
  private val scope: CoroutineScope, private val nowSeconds: () -> Long = { System.currentTimeMillis() / 1000 },
  private val clearProvider: suspend () -> Unit = {}
) {
  private val lock = Any()
  private val network = Mutex()
  private var generation = 0L
  private var session: AuthSession? = null
  private var renewal: Job? = null
  private val mutable = MutableStateFlow(AuthState())
  val state: StateFlow<AuthState> = mutable.asStateFlow()
  val configured get() = gateway != null

  private fun begin(): Long = synchronized(lock) {
    generation++; renewal?.cancel(); session = null
    mutable.value = AuthState(AuthPhase.LOADING)
    generation
  }
  private fun current(ticket: Long) = synchronized(lock) { ticket == generation }
  private fun erase(): Boolean = try { vault.clear(); true } catch (_: Exception) { false }
  private fun fail(ticket: Long, message: String) = synchronized(lock) {
    if (ticket == generation) {
      session = null; renewal?.cancel(); erase()
      mutable.value = AuthState(AuthPhase.ERROR, message = message)
    }
  }
  private fun accept(ticket: Long, next: AuthSession) = synchronized(lock) {
    if (ticket != generation) return@synchronized
    require(next.user.id.isNotBlank() && next.refreshToken.isNotBlank() && next.accessToken.isNotBlank())
    require(next.expiresAtSeconds > nowSeconds())
    // Synchronous atomic persistence and generation check prevent logout/write races.
    vault.write(next.refreshToken)
    session = next
    mutable.value = AuthState(AuthPhase.AUTHENTICATED, next.user)
    schedule(ticket, next)
  }
  private fun schedule(ticket: Long, next: AuthSession) {
    renewal?.cancel()
    renewal = scope.launch {
      delay(((next.expiresAtSeconds - nowSeconds() - 60).coerceAtLeast(1)) * 1000)
      if (current(ticket)) refreshIfNeeded()
    }
  }

  fun restore() {
    val ticket = begin()
    scope.launch {
      try {
        network.withLock {
          if (!current(ticket)) return@withLock
          val token = synchronized(lock) { if (current(ticket)) vault.read() else null }
          if (token == null) {
            synchronized(lock) { if (current(ticket)) mutable.value = AuthState() }
          } else if (gateway == null) {
            fail(ticket, "Configuração de login incompleta. Entre novamente após configurá-la.")
          } else {
            // Never trust a saved UID: obtain and verify a fresh session on process recreation.
            accept(ticket, withTimeout(20_000) { gateway.refresh(token) })
          }
        }
      } catch (_: TimeoutCancellationException) { fail(ticket, "A restauração demorou demais. Entre novamente.") }
      catch (e: CancellationException) { throw e }
      catch (_: Exception) { fail(ticket, "Não foi possível restaurar a sessão. Entre novamente com conexão disponível.") }
    }
  }

  fun signIn(credential: suspend (hashedNonce: String) -> String) {
    val ticket = begin()
    synchronized(lock) { if (!erase()) { fail(ticket, "Não foi possível limpar a sessão local."); return } }
    if (gateway == null) { fail(ticket, "Login Google indisponível: configuração pública incompleta."); return }
    scope.launch {
      try {
        val nonce = ByteArray(32).also { SecureRandom().nextBytes(it) }.joinToString("") { "%02x".format(it) }
        val hash = MessageDigest.getInstance("SHA-256").digest(nonce.toByteArray()).joinToString("") { "%02x".format(it) }
        val token = credential(hash)
        if (token.isBlank()) throw AuthRejected()
        network.withLock {
          if (current(ticket)) accept(ticket, withTimeout(20_000) { gateway.signIn(token, nonce) })
        }
      } catch (_: LoginCancelled) { fail(ticket, "Login cancelado. Nenhuma conta foi conectada.") }
      catch (_: TimeoutCancellationException) { fail(ticket, "A verificação demorou demais. Tente novamente.") }
      catch (e: CancellationException) { fail(ticket, "Login interrompido. Tente novamente."); throw e }
      catch (_: Exception) { fail(ticket, "Não foi possível verificar a conta. Confira sua conexão e tente novamente.") }
    }
  }

  fun refreshIfNeeded() {
    val ticket = synchronized(lock) { generation }
    scope.launch {
      try {
        network.withLock {
          val old = synchronized(lock) { if (current(ticket)) session else null } ?: return@withLock
          if (old.expiresAtSeconds - nowSeconds() > 60) return@withLock
          val next = withTimeout(20_000) { requireNotNull(gateway).refresh(old.refreshToken) }
          if (next.user.id != old.user.id) throw AuthRejected()
          accept(ticket, next)
        }
      } catch (_: TimeoutCancellationException) { fail(ticket, "A renovação demorou demais. Entre novamente.") }
      catch (e: CancellationException) { throw e }
      catch (_: Exception) { fail(ticket, "Sessão expirada ou conexão indisponível. Entre novamente.") }
    }
  }

  fun enterGuest() { leave(AuthPhase.GUEST) }
  fun signOut() { leave(AuthPhase.SIGNED_OUT) }
  private fun leave(phase: AuthPhase) {
    val (ticket, old) = synchronized(lock) {
      val old = session; generation++; renewal?.cancel(); session = null
      val cleared = erase()
      mutable.value = AuthState(phase, message = if (cleared) null else "Sessão encerrada. Falha ao limpar armazenamento; feche o app e limpe seus dados.")
      generation to old
    }
    scope.launch {
      var failed = false
      try { clearProvider() } catch (e: CancellationException) { throw e } catch (_: Exception) { failed = true }
      try { withTimeout(20_000) { if (old != null) gateway?.signOut(old.accessToken) } }
      catch (_: TimeoutCancellationException) { failed = true }
      catch (e: CancellationException) { throw e }
      catch (_: Exception) { failed = true }
      synchronized(lock) {
        if (ticket == generation && failed) mutable.value = mutable.value.copy(
          message = "Você saiu deste aparelho. Não foi possível confirmar o encerramento remoto; a sessão no servidor pode continuar válida.")
      }
    }
  }
}
