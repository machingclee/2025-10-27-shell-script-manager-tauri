package com.scriptmanager.domain.infrastructure

interface CommandHandler<T : Any, R> {
    fun handle(eventQueue: EventQueue, command: T): R
}