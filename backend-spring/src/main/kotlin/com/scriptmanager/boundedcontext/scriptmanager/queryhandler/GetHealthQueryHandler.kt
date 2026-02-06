package com.scriptmanager.boundedcontext.scriptmanager.queryhandler

import com.scriptmanager.common.domainutils.QueryHandler
import com.scriptmanager.boundedcontext.scriptmanager.query.GetHealthQuery
import com.scriptmanager.boundedcontext.scriptmanager.query.HealthResponse
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component

@Component
class GetHealthQueryHandler(
    @Value("\${spring.datasource.url}")
    private val databaseUrl: String
) : QueryHandler<GetHealthQuery, HealthResponse> {

    override fun handle(query: GetHealthQuery): HealthResponse {
        return HealthResponse(databaseUrl = databaseUrl)
    }
}

