package com.scriptmanager.common.utils

import jakarta.transaction.Transactional
import org.springframework.stereotype.Component

@Component
class TransactionUtil {
    @Transactional
    open fun <T> run(block: () -> T) {
        block()
    }
}