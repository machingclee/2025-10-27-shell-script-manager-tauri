package com.scriptmanager.common.utils

import java.util.concurrent.CompletableFuture
import java.util.concurrent.CompletionException
import java.util.concurrent.ConcurrentLinkedQueue
import org.springframework.core.task.VirtualThreadTaskExecutor

private val virtualThreads by lazy { VirtualThreadTaskExecutor("script-manager-vt-") }

/** True when this thread is a JDK virtual thread. */
fun Thread.isVirtualThread(): Boolean = isVirtual

/**
 * Runs [block] on a virtual thread and waits for it.
 *
 * When the caller is already a virtual thread, [block] runs inline. That is
 * the normal Spring MVC request path once `spring.threads.virtual.enabled`
 * is on and the process is Java 21+: hopping threads would drop the
 * transaction, Hibernate session, and trace context bound to this thread.
 *
 * Platform-thread callers start one virtual thread and block until [block] finishes.
 */
fun <T> runOnVirtualThread(block: () -> T): T {
    if (Thread.currentThread().isVirtualThread()) {
        return block()
    }
    return executeOnVirtualThread(block).awaitResult()
}

/**
 * Structured fan-out for blocking work. [block] runs on the caller.
 * Every [VirtualThreadScope.fork] runs on its own virtual thread. The scope
 * waits for all of them before it returns.
 *
 * A failing fork interrupts the others. The scope then throws that failure.
 *
 * A fork does not see the caller's Spring transaction or Hibernate session.
 * Each fork that touches JPA needs its own transaction. This app's Hikari
 * pool is 5 connections, so parallel database forks stall once those are busy.
 */
fun <R> virtualThreadScope(block: VirtualThreadScope.() -> R): R {
    val scope = VirtualThreadScope()
    val result = try {
        scope.block()
    } catch (thrown: Throwable) {
        scope.cancel()
        scope.attachFailures(thrown)
        throw thrown
    }
    scope.join()
    return result
}

class VirtualThreadScope internal constructor() {
    private val tasks = ConcurrentLinkedQueue<Running<*>>()
    private val lock = Any()

    @Volatile
    private var cancelled = false

    @Volatile
    private var firstFailure: Throwable? = null

    /**
     * Starts [block] on a new virtual thread. The returned future completes
     * with its value or exception. Unread futures are still joined when the
     * scope exits.
     */
    fun <T> fork(block: () -> T): CompletableFuture<T> {
        val future = CompletableFuture<T>()
        val thread = virtualThreads.virtualThreadFactory.newThread {
            try {
                future.complete(block())
            } catch (thrown: Throwable) {
                future.completeExceptionally(thrown)
                if (thrown !is InterruptedException) {
                    fail(thrown)
                }
            }
        }
        synchronized(lock) {
            firstFailure?.let { throw it }
            check(!cancelled) { "virtualThreadScope is cancelled" }
            tasks.add(Running(thread, future))
            thread.start()
        }
        return future
    }

    internal fun join() {
        if (tasks.isEmpty()) return
        try {
            CompletableFuture.allOf(*tasks.map { it.future }.toTypedArray()).join()
        } catch (_: CompletionException) {
            cancel()
            throw collectedFailure()
        }
    }

    internal fun cancel() {
        val running = synchronized(lock) {
            if (cancelled) return
            cancelled = true
            tasks.map { it.thread }
        }
        running.forEach { it.interrupt() }
    }

    internal fun attachFailures(primary: Throwable) {
        for (cause in joinCauses()) {
            if (cause !== primary) {
                primary.addSuppressed(cause)
            }
        }
    }

    private fun fail(thrown: Throwable) {
        synchronized(lock) {
            if (firstFailure == null) {
                firstFailure = thrown
            }
        }
        cancel()
    }

    private fun collectedFailure(): Throwable {
        val causes = joinCauses()
        val primary = firstFailure
            ?: causes.firstOrNull { it !is InterruptedException }
            ?: causes.first()
        causes.filter { it !== primary }.forEach { primary.addSuppressed(it) }
        return primary
    }

    private fun joinCauses(): List<Throwable> {
        val causes = mutableListOf<Throwable>()
        for (task in tasks) {
            try {
                task.future.join()
            } catch (completion: CompletionException) {
                causes += completion.cause ?: completion
            } catch (thrown: Throwable) {
                causes += thrown
            }
        }
        return causes
    }

    private class Running<T>(val thread: Thread, val future: CompletableFuture<T>)
}

/**
 * Waits for this future and throws its cause, so a failed fork is not wrapped
 * in [CompletionException].
 */
fun <T> CompletableFuture<T>.awaitResult(): T =
    try {
        join()
    } catch (completion: CompletionException) {
        throw completion.cause ?: completion
    }

private fun <T> executeOnVirtualThread(block: () -> T): CompletableFuture<T> {
    val future = CompletableFuture<T>()
    virtualThreads.virtualThreadFactory.newThread {
        try {
            future.complete(block())
        } catch (thrown: Throwable) {
            future.completeExceptionally(thrown)
        }
    }.start()
    return future
}
