package com.scriptmanager.controller

import org.springframework.stereotype.Controller
import org.springframework.web.bind.annotation.GetMapping

@Controller
class SwaggerRedirectController {
    @GetMapping("/api")
    fun redirectToSwaggerRoot(): String {
        // Redirect root to the configured swagger-ui path (/docs)
        return "redirect:/docs"
    }
}
