package com.scriptmanager.controller

import org.springframework.stereotype.Controller
import org.springframework.web.bind.annotation.GetMapping

@Controller
class SwaggerRedirectController {

    @GetMapping("/api")
    fun redirectToSwagger(): String {
        // The swagger-ui is configured at /docs in application.yml
        return "redirect:/docs"
    }
}
