package com.scriptmanager.common.domainutils

interface CommandHandler<T : Any, R> {
    fun handle(eventQueue: EventQueue, command: T): R

    /**
     * Override this method to declare what events this handler can produce.
     * This allows the CommandInvoker to build a static flow map without execution.
     * Return empty list if you don't want to participate in flow tracking.
     */
    fun declareEvents(): List<Class<*>>
}