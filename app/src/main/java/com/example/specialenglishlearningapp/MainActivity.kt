package com.example.specialenglishlearningapp

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.example.specialenglishlearningapp.databinding.ActivityMainBinding
import com.example.specialenglishlearningapp.fragments.EditFragment
import com.example.specialenglishlearningapp.fragments.LearnFragment
import com.example.specialenglishlearningapp.fragments.ReviewFragment
import com.example.specialenglishlearningapp.utils.Logger
import com.example.specialenglishlearningapp.utils.LearningProgressManager
import com.example.specialenglishlearningapp.utils.SyncManager
import com.example.specialenglishlearningapp.data.AppDatabase
import com.google.android.material.bottomnavigation.BottomNavigationView
import kotlinx.coroutines.launch

class MainActivity : AppCompatActivity() {
    private lateinit var binding: ActivityMainBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Logger.d("MainActivity onCreate")

        // Hide ActionBar
        supportActionBar?.hide()

        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // Sync data from server on app startup
        syncDataFromServer()

        // Initialize LearningProgressManager from Appwrite
        initializeLearningProgress()

        setupTabs()
    }

    private fun syncDataFromServer() {
        lifecycleScope.launch {
            Logger.d("📥 Starting app startup sync from server...")
            val database = AppDatabase.getDatabase(this@MainActivity)
            val syncManager = SyncManager(this@MainActivity, database)

            val result = syncManager.syncServerToClient()
            if (result.isSuccess) {
                Logger.d("✅ App startup sync completed successfully")
            } else {
                Logger.e("⚠️ App startup sync failed: ${result.exceptionOrNull()?.message}")
            }
        }
    }

    private fun initializeLearningProgress() {
        lifecycleScope.launch {
            val result = LearningProgressManager.initialize(this@MainActivity)
            if (result.isSuccess) {
                Logger.d("LearningProgressManager initialized successfully")
            } else {
                Logger.e("Failed to initialize LearningProgressManager: ${result.exceptionOrNull()?.message}")
            }
        }
    }

    private fun setupTabs() {
        Logger.d("Setting up bottom navigation")
        
        // Show EditFragment by default
        replaceFragment(EditFragment())

        binding.bottomNavigation.setOnItemSelectedListener { item ->
            when (item.itemId) {
                R.id.nav_edit -> {
                    Logger.d("Edit tab selected")
                    replaceFragment(EditFragment())
                    true
                }
                R.id.nav_learn -> {
                    Logger.d("Learn tab selected")
                    replaceFragment(LearnFragment())
                    true
                }
                R.id.nav_review -> {
                    Logger.d("Review tab selected")
                    replaceFragment(ReviewFragment())
                    true
                }
                else -> false
            }
        }
    }

    private fun replaceFragment(fragment: Fragment) {
        Logger.d("Replacing fragment with ${fragment.javaClass.simpleName}")
        supportFragmentManager.beginTransaction()
            .replace(binding.fragmentContainer.id, fragment)
            .commit()
    }
}
