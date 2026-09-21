package com.example.data

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/** No connection is claimed without authenticated, applied data. A2 implements it. */
data class SupabaseCloudStatus(
  val isConnected: Boolean = false,
  val isSyncing: Boolean = false,
  val lastSyncMessage: String = "Sincronização indisponível nesta versão. Dados locais não são enviados."
)

class SupabaseManager private constructor() {
  companion object {
    private val holder = SupabaseManager()
    fun getInstance(): SupabaseManager = holder
  }
  private val _cloudStatus = MutableStateFlow(SupabaseCloudStatus())
  val cloudStatus: StateFlow<SupabaseCloudStatus> = _cloudStatus.asStateFlow()
  fun clearSession() { _cloudStatus.value = SupabaseCloudStatus() }
  suspend fun syncCloudData(): Result<Unit> {
    _cloudStatus.value = SupabaseCloudStatus()
    return Result.failure(IllegalStateException(_cloudStatus.value.lastSyncMessage))
  }
}
