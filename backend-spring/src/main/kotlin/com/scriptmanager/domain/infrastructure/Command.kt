package com.scriptmanager.domain.infrastructure

/**
 * Marker interface for commands that return a result of type R.
 * Commands are write operations that may modify state and produce domain events.
 */
interface Command<R>

