package com.scriptmanager.controller

import com.machingclee.domain.util.common.interfaces.CommandInvoker
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/commands")
class CommandFlowController(
    private val commandInvoker: CommandInvoker
) {

    @GetMapping("/flow")
    fun getCommandFlow() = commandInvoker.getFlow()
}

