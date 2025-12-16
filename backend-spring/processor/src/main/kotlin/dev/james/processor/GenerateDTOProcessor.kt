package dev.james.processor

import com.google.devtools.ksp.processing.*
import com.squareup.kotlinpoet.*
import com.google.devtools.ksp.symbol.KSClassDeclaration
import com.google.devtools.ksp.symbol.KSAnnotated
import com.google.devtools.ksp.symbol.KSPropertyDeclaration
import com.squareup.kotlinpoet.ksp.TypeParameterResolver
import com.squareup.kotlinpoet.ksp.toTypeName
import com.squareup.kotlinpoet.ksp.toTypeParameterResolver
import com.squareup.kotlinpoet.ksp.writeTo

data class DTOProperty(
    val name: String,
    val type: TypeName,
    val accessor: String, // How to access this field from the entity
)

class GenerateDTOProcessor(
    private val codeGenerator: CodeGenerator,
    private val logger: KSPLogger,
) : SymbolProcessor {

    override fun process(resolver: Resolver): List<KSAnnotated> {
        val symbols = resolver.getSymbolsWithAnnotation(GenerateDTO::class.qualifiedName!!)
            .filterIsInstance<KSClassDeclaration>()

        symbols.forEach { classDeclaration ->
            generateDTOAndExtension(classDeclaration, resolver)
        }

        return emptyList()
    }

    private fun generateDTOAndExtension(classDeclaration: KSClassDeclaration, resolver: Resolver) {
        val packageName = classDeclaration.packageName.asString()
        val className = classDeclaration.simpleName.asString()

        // Resolve type parameters for the class
        val typeParameterResolver = classDeclaration.typeParameters.toTypeParameterResolver()

        // Get all DTO properties (regular columns + flattened embedded fields)
        val dtoProperties = mutableListOf<DTOProperty>()

        classDeclaration.getAllProperties().forEach { property ->
            when {
                // @Id properties (primary keys)
                property.annotations.any { it.shortName.asString() == "Id" } -> {
                    val propertyName = property.simpleName.asString()
                    val typeName = property.type.toTypeName(typeParameterResolver)
                    dtoProperties.add(
                        DTOProperty(
                            name = propertyName,
                            type = typeName,
                            accessor = propertyName
                        )
                    )
                }
                
                // Regular @Column properties
                property.annotations.any { it.shortName.asString() == "Column" } -> {
                    val columnName = getColumnName(property) ?: property.simpleName.asString()
                    val camelCaseName = snakeToCamelCase(columnName)
                    val typeName = property.type.toTypeName(typeParameterResolver)
                    dtoProperties.add(
                        DTOProperty(
                            name = camelCaseName,
                            type = typeName,
                            accessor = property.simpleName.asString()
                        )
                    )
                }

                // @Embedded properties - flatten them
                property.annotations.any { it.shortName.asString() == "Embedded" } -> {
                    val embeddedProperties = getEmbeddedProperties(property, resolver, typeParameterResolver)
                    dtoProperties.addAll(embeddedProperties)
                }
            }
        }

        // Generate DTO class
        val dtoClassName = "${className}DTO"
        val dtoTypeSpec = TypeSpec.classBuilder(dtoClassName)
            .addModifiers(KModifier.DATA)
            .primaryConstructor(
                FunSpec.constructorBuilder()
                    .addParameters(
                        dtoProperties.map { property ->
                            ParameterSpec.builder(property.name, property.type).build()
                        }
                    )
                    .build()
            )
            .addProperties(
                dtoProperties.map { property ->
                    PropertySpec.builder(property.name, property.type)
                        .initializer(property.name)
                        .build()
                }
            )
            .build()

        // Generate extension function
        val extensionFunction = FunSpec.builder("toDTO")
            .receiver(ClassName(packageName, className))
            .returns(ClassName(packageName, dtoClassName))
            .addCode(
                buildString {
                    append("return $dtoClassName(\n")
                    dtoProperties.forEach { property ->
                        append("    ${property.accessor},\n")
                    }
                    append(")")
                }
            )
            .build()

        // Write the DTO class and extension function to file
        val fileSpec = FileSpec.builder(packageName, dtoClassName)
            .addType(dtoTypeSpec)
            .addFunction(extensionFunction)
            .build()

        val dependencies = Dependencies(true, *listOfNotNull(classDeclaration.containingFile).toTypedArray())
        fileSpec.writeTo(codeGenerator, dependencies)
    }

    private fun getEmbeddedProperties(
        embeddedProperty: KSPropertyDeclaration,
        @Suppress("UNUSED_PARAMETER") resolver: Resolver,
        typeParameterResolver: TypeParameterResolver,
    ): List<DTOProperty> {
        val embeddedProperties = mutableListOf<DTOProperty>()

        // Get the type declaration of the embedded class
        val embeddedTypeDeclaration = embeddedProperty.type.resolve().declaration as? KSClassDeclaration
            ?: return emptyList()

        // Check if it's marked as @Embeddable (optional validation)
        val isEmbeddable = embeddedTypeDeclaration.annotations.any {
            it.shortName.asString() == "Embeddable"
        }

        if (!isEmbeddable) {
            logger.warn("Property ${embeddedProperty.simpleName.asString()} is marked @Embedded but its type is not @Embeddable")
        }

        // Get all properties from the embedded class that have @Column
        embeddedTypeDeclaration.getAllProperties().forEach { embeddedFieldProperty ->
            val columnAnnotation = embeddedFieldProperty.annotations.find {
                it.shortName.asString() == "Column"
            }

            if (columnAnnotation != null) {
                val fieldName = embeddedFieldProperty.simpleName.asString()
                val fieldType = embeddedFieldProperty.type.toTypeName(typeParameterResolver)
                val embeddedPropertyName = embeddedProperty.simpleName.asString()

                // Extract column name from @Column annotation and convert to camelCase
                val columnName = getColumnName(embeddedFieldProperty) ?: fieldName
                val camelCaseName = snakeToCamelCase(columnName)

                embeddedProperties.add(
                    DTOProperty(
                        name = camelCaseName,
                        type = fieldType,
                        accessor = "${embeddedPropertyName}.${fieldName}"
                    )
                )
            }
        }

        return embeddedProperties
    }

    private fun getColumnName(property: KSPropertyDeclaration): String? {
        val columnAnnotation = property.annotations.find { it.shortName.asString() == "Column" }
        val rawValue = columnAnnotation?.arguments?.find { it.name?.asString() == "name" }?.value?.toString()
        val cleaned = rawValue?.removeSurrounding("\"")?.trim()
        return if (cleaned.isNullOrEmpty()) null else cleaned
    }

    private fun snakeToCamelCase(snakeCase: String): String {
        if (snakeCase.isBlank()) return snakeCase
        return snakeCase.split("_").mapIndexed { index, word ->
            if (index == 0) {
                word.lowercase()
            } else {
                word.lowercase().replaceFirstChar { it.uppercase() }
            }
        }.joinToString("")
    }
}