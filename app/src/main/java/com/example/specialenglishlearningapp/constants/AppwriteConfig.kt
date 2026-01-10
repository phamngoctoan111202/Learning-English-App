package com.example.specialenglishlearningapp.constants

object AppwriteConfig {
    const val APPWRITE_PROJECT_ID = "68cf65390012ceaa2085"
    const val APPWRITE_PROJECT_NAME = "SpecialEnglishApp"
    const val APPWRITE_PUBLIC_ENDPOINT = "https://fra.cloud.appwrite.io/v1"
    
    // Database and Collections
    const val DATABASE_ID = "68cfb8c900053dca6f90"
    const val VOCABULARY_COLLECTION_ID = "vocabularies"
    const val LEARNING_PROGRESS_COLLECTION_ID = "learning_progress"
    // const val EXAMPLES_COLLECTION_ID = "examples" // No longer needed
    
    // Note: API Key is not used in client-side apps for security reasons
    // Anonymous authentication is used instead
}
