package com.scriptmanager.integration

import org.junit.platform.suite.api.SelectClasses
import org.junit.platform.suite.api.Suite
import org.junit.platform.suite.api.SuiteDisplayName

/**
 * Test Suite that controls execution order of integration tests.
 *
 * DataSetupTest runs FIRST to inject test data.
 * Other tests run after, using the data from DataSetupTest.
 *
 * All tests share the same PostgreSQL container (withReuse=true)
 * and database (ddl-auto=create, so data persists across tests).
 *
 * Run this suite with:
 * ./gradlew test --tests IntegrationTestSuite
 */
@Suite
@SuiteDisplayName("Integration Tests with Data Setup")
@SelectClasses(
    DataSetupTest::class,              // Runs FIRST - sets up test data
    CommandInvokerIntegrationTest::class  // Runs SECOND - uses the test data
    // Add more test classes here in desired order
)
class IntegrationTestSuite

