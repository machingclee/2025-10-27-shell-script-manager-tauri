package com.scriptmanager.common.exceptionhandler

import com.scriptmanager.common.dto.ApiResponse
import jakarta.servlet.http.HttpServletRequest
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.ControllerAdvice
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.ResponseBody


@ControllerAdvice
class GlobalExceptionHandler {

    // only handle JWT error
    //@ResponseStatus(HttpStatus.UNAUTHORIZED)
    //@ResponseBody
    //@ExceptionHandler(JWTExpiredException::class)
    //fun handJWTExpire(req: HttpServletRequest, e: JWTExpiredException): ResponseEntity<Map<String, Any>> {
    //    e.printStackTrace()
    //    // sendErrorViaEmail(e, req)
    //
    //    val resbody = mapOf(
    //        "success" to false,
    //        "errorMessage" to "JWT_EXPIRED"
    //    )
    //
    //    return ResponseEntity
    //        .status(HttpStatus.UNAUTHORIZED)
    //        .body(resbody)
    //}
    // else any error go here

    @ResponseBody
    @ExceptionHandler(Exception::class)
    fun handleException(req: HttpServletRequest, e: Exception): ResponseEntity<ApiResponse<Unit>> {
        // Log full stacktrace for diagnostics
        e.printStackTrace()

        // Map some common exception types to HTTP statuses and codes
        val (status, code) = when {
            e is IllegalArgumentException -> Pair(HttpStatus.BAD_REQUEST, HttpStatus.BAD_REQUEST.value())
            e is NoSuchElementException -> Pair(HttpStatus.NOT_FOUND, HttpStatus.NOT_FOUND.value())
            // avoid compile-time dependency on spring-security: detect by runtime class name as well
            e is SecurityException || e.javaClass.name == "org.springframework.security.access.AccessDeniedException" ->
                Pair(HttpStatus.FORBIDDEN, HttpStatus.FORBIDDEN.value())

            else -> Pair(HttpStatus.INTERNAL_SERVER_ERROR, HttpStatus.INTERNAL_SERVER_ERROR.value())
        }

        val body = ApiResponse<Unit>(
            success = false,
            errorMessage = e.message ?: "An error occurred",
            errorCode = code
        )

        return ResponseEntity.status(status).body(body)
    }

}
