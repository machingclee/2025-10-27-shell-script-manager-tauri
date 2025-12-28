package com.scriptmanager.controller

import com.scriptmanager.domain.infrastructure.CommandInvoker
import com.scriptmanager.domain.infrastructure.QueryInvoker
import io.swagger.v3.oas.annotations.tags.Tag
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/ai")
@Tag(name = "Health Check", description = "APIs for Agentic Solution")
class AIController(
    private val queryInvoker: QueryInvoker,
    private val commandInvoker: CommandInvoker
) {
    @PostMapping("/ai-profile")
    fun createApiProfile() {

    }
}

