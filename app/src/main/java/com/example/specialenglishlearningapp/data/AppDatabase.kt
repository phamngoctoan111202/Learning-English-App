package com.example.specialenglishlearningapp.data

import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase
import android.content.Context

@Database(
    entities = [Vocabulary::class, Example::class],
    version = 10,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun vocabularyDao(): VocabularyDao
    abstract fun exampleDao(): ExampleDao
    abstract fun vocabularyWithExamplesDao(): VocabularyWithExamplesDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        /**
         * Migration from version 6 to 7: Add last10Attempts column
         */
        private val MIGRATION_6_7 = object : Migration(6, 7) {
            override fun migrate(database: SupportSQLiteDatabase) {
                // Add new column for tracking last 10 attempts
                database.execSQL(
                    "ALTER TABLE vocabularies ADD COLUMN last10Attempts TEXT NOT NULL DEFAULT '[]'"
                )
            }
        }

        /**
         * Migration from version 7 to 8: Add category column
         */
        private val MIGRATION_7_8 = object : Migration(7, 8) {
            override fun migrate(database: SupportSQLiteDatabase) {
                // Add category column with default value GENERAL
                database.execSQL(
                    "ALTER TABLE vocabularies ADD COLUMN category TEXT NOT NULL DEFAULT 'GENERAL'"
                )
            }
        }

        /**
         * Migration from version 8 to 9: Add grammar column to examples
         */
        private val MIGRATION_8_9 = object : Migration(8, 9) {
            override fun migrate(database: SupportSQLiteDatabase) {
                // Add grammar column to examples table
                database.execSQL(
                    "ALTER TABLE examples ADD COLUMN grammar TEXT"
                )
            }
        }

        /**
         * Migration from version 9 to 10: Add grammar column to vocabularies
         */
        private val MIGRATION_9_10 = object : Migration(9, 10) {
            override fun migrate(database: SupportSQLiteDatabase) {
                // Add grammar column to vocabularies table (shared grammar for all examples)
                database.execSQL(
                    "ALTER TABLE vocabularies ADD COLUMN grammar TEXT"
                )
            }
        }

        fun getDatabase(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "vocabulary_database"
                )
                    .addMigrations(MIGRATION_6_7, MIGRATION_7_8, MIGRATION_8_9, MIGRATION_9_10)
                    .fallbackToDestructiveMigration()
                    .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
