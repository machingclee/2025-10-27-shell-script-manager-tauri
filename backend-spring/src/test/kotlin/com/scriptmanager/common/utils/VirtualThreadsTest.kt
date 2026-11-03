package com.scriptmanager.common.utils

import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import org.junit.jupiter.api.Assertions.assertNotSame
import org.junit.jupiter.api.Assertions.assertSame
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Assumptions.assumeTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.Timeout

class VirtualThreadsTest {

    @Test
    fun `runOnVirtualThread hops off a platform thread`() {
        assumeVirtualThreads()
        assumeTrue(!Thread.currentThread().isVirtualThread())

        val caller = Thread.currentThread()
        val seen = runOnVirtualThread { Thread.currentThread() }

        assertTrue(seen.isVirtualThread())
        assertNotSame(caller, seen)
    }

    @Test
    fun `runOnVirtualThread stays on the current virtual thread`() {
        assumeVirtualThreads()

        runOnVirtualThread {
            val carrier = Thread.currentThread()
            val again = runOnVirtualThread { Thread.currentThread() }
            assertTrue(carrier.isVirtualThread())
            assertSame(carrier, again)
        }
    }

    @Test
    fun `forks run at the same time and join before the scope returns`() {
        assumeVirtualThreads()
        val bothRunning = CountDownLatch(2)
        val release = CountDownLatch(1)

        val ids = virtualThreadScope {
            val left = fork {
                bothRunning.countDown()
                assertTrue(release.await(5, TimeUnit.SECONDS))
                Thread.currentThread().threadId()
            }
            val right = fork {
                bothRunning.countDown()
                assertTrue(release.await(5, TimeUnit.SECONDS))
                Thread.currentThread().threadId()
            }
            assertTrue(bothRunning.await(5, TimeUnit.SECONDS))
            release.countDown()
            setOf(left.awaitResult(), right.awaitResult())
        }

        assertTrue(ids.size == 2)
    }

    @Test
    @Timeout(5)
    fun `a failed fork interrupts the others and surfaces the original exception`() {
        assumeVirtualThreads()
        val parked = CountDownLatch(1)

        val failure = assertThrows(IllegalStateException::class.java) {
            virtualThreadScope {
                fork {
                    parked.countDown()
                    Thread.sleep(30_000)
                }
                fork {
                    assertTrue(parked.await(5, TimeUnit.SECONDS))
                    throw IllegalStateException("boom")
                }
            }
        }

        assertTrue(failure.message == "boom")
    }

    private fun assumeVirtualThreads() {
        assumeTrue(Runtime.version().feature() >= 21, "virtual threads need Java 21+")
    }
}
