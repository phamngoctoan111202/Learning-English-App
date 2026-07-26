package com.example.specialenglishlearningapp.dialogs

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.RadioGroup
import android.widget.TextView
import android.widget.Toast
import androidx.fragment.app.DialogFragment
import com.example.specialenglishlearningapp.R
import com.example.specialenglishlearningapp.utils.ExampleUtils
import com.example.specialenglishlearningapp.utils.Logger

class BulkImportDialog(
    private val onSave: (word: String, examplesCombined: List<String>, category: String, vocabularyGrammar: String?) -> Unit
) : DialogFragment() {

    private lateinit var radioGroupCategory: RadioGroup
    private lateinit var editTextBulkContent: EditText

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.dialog_bulk_import, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        radioGroupCategory = view.findViewById(R.id.radioGroupBulkCategory)
        editTextBulkContent = view.findViewById(R.id.editTextBulkContent)

        val buttonLoadMobile: Button = view.findViewById(R.id.buttonLoadMobile)
        val buttonLoadWeb: Button = view.findViewById(R.id.buttonLoadWeb)
        val buttonCopyPrompt: Button = view.findViewById(R.id.buttonCopyPrompt)
        val buttonClearInput: Button = view.findViewById(R.id.buttonClearInput)
        val buttonCancel: TextView = view.findViewById(R.id.buttonCancel)
        val buttonImport: TextView = view.findViewById(R.id.buttonImport)

        buttonLoadMobile.setOnClickListener {
            loadPresetData("MOBILE")
        }

        buttonLoadWeb.setOnClickListener {
            loadPresetData("WEB")
        }

        buttonCopyPrompt.setOnClickListener {
            copyAiPrompt()
        }

        buttonClearInput.setOnClickListener {
            editTextBulkContent.setText("")
        }

        buttonCancel.setOnClickListener {
            dismiss()
        }

        buttonImport.setOnClickListener {
            importBulkData()
        }

        // Default to mobile preset on launch if empty
        if (editTextBulkContent.text.isNullOrBlank()) {
            loadPresetData("MOBILE")
        }
    }

    override fun onStart() {
        super.onStart()
        val dm = resources.displayMetrics
        val targetWidth = (dm.widthPixels * 0.95f).toInt()
        val targetHeight = (dm.heightPixels * 0.85f).toInt()
        dialog?.window?.setLayout(targetWidth, targetHeight)
    }

    private fun loadPresetData(type: String) {
        if (type == "MOBILE") {
            editTextBulkContent.setText(
                """
                Activity | An activity represents a single screen with a user interface in Android. | Component activity đại diện cho một màn hình đơn với UI trong Android. | Noun - Core Android application component for UI screens.
                Fragment | A fragment represents a reusable portion of a user interface in an activity. | Fragment đại diện cho một phần UI có thể tái sử dụng trong một activity. | Noun - Modular UI block within an Android activity.
                State | State management ensures UI components automatically react to data changes. | Quản lý state đảm bảo các UI component tự động phản ứng với thay đổi dữ liệu. | Noun - Current data status driving UI representation.
                Composable | Composable functions declare UI elements declaratively in Jetpack Compose. | Các hàm composable khai báo phần tử UI theo phong phong cách khai báo trong Compose. | Noun - Building block function in modern Android UI toolkit.
                Lifecycle | Understanding the component lifecycle prevents memory leaks and crashes. | Hiểu rõ vòng đời của component giúp tránh rò rỉ bộ nhớ và crash app. | Noun - Series of states a component passes through from creation to destruction.
                """.trimIndent()
            )
            radioGroupCategory.check(R.id.radioMobile)
        } else if (type == "WEB") {
            editTextBulkContent.setText(
                """
                DOM | The Document Object Model represents the web page structure as a logical tree. | Mô hình đối tượng tài liệu biểu diễn cấu trúc trang web dạng cây logic. | Noun - Programming interface for HTML documents.
                Component | A reusable component encapsulates markup, styles, and state behavior. | Component có thể tái sử dụng đóng gói cấu trúc, kiểu dáng và hành vi. | Noun - Modular building block in modern web frameworks.
                Hydration | Client-side hydration attaches event listeners to server-rendered HTML. | Hydration phía client gắn các trình lắng nghe sự kiện vào HTML được render từ server. | Noun - Process of adding interactivity to static HTML.
                SSR | Server-side rendering renders web pages on the server before sending to the browser. | Render phía server tạo ra trang web trên server trước khi gửi tới trình duyệt. | Noun - Method of generating HTML on the server.
                Responsive | Responsive web design ensures optimal viewing experience across device sizes. | Thiết kế web tương thích đảm bảo trải nghiệm hiển thị tối ưu trên mọi màn hình. | Adjective - Adapting layout dynamically to screen size.
                """.trimIndent()
            )
            radioGroupCategory.check(R.id.radioWeb)
        }
    }

    private fun copyAiPrompt() {
        val selectedCategory = when (radioGroupCategory.checkedRadioButtonId) {
            R.id.radioMobile -> "Mobile Development"
            R.id.radioWeb -> "Web Development"
            R.id.radioWriting -> "IELTS Writing"
            else -> "General English"
        }

        val promptText = """
            Hãy tạo cho tôi danh sách từ vựng tiếng Anh theo chủ đề: $selectedCategory (hoặc chủ đề mà tôi yêu cầu) theo đúng định dạng sau (mỗi từ trên 1 dòng, phân cách bởi dấu gạch đứng |):

            Từ vựng | Câu ví dụ tiếng Anh chứa từ đó | Dịch nghĩa tiếng Việt câu ví dụ | Giải thích ngữ pháp/Từ loại

            Ví dụ mẫu:
            Activity | An activity represents a single screen with a user interface in Android. | Component activity đại diện cho một màn hình đơn với UI trong Android. | Noun - Core Android application component for UI screens.
            DOM | The Document Object Model represents the web page structure as a logical tree. | Mô hình đối tượng tài liệu biểu diễn cấu trúc trang web dạng cây logic. | Noun - Programming interface for HTML documents.

            Vui lòng tạo 10 từ vựng hay và quan trọng nhất. Chỉ trả về dữ liệu kết quả theo đúng định dạng dòng ở trên, không cần thêm lời chào hay giải thích gì khác.
        """.trimIndent()

        val clipboard = requireContext().getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        val clip = ClipData.newPlainText("AI Prompt", promptText)
        clipboard.setPrimaryClip(clip)

        Toast.makeText(context, "✅ Đã sao chép Prompt AI! Hãy dán vào ChatGPT/Gemini để tạo từ vựng.", Toast.LENGTH_LONG).show()
    }

    private fun importBulkData() {
        val rawContent = editTextBulkContent.text.toString().trim()
        if (rawContent.isEmpty()) {
            Toast.makeText(context, "Vui lòng nhập hoặc chọn mẫu dữ liệu để import", Toast.LENGTH_SHORT).show()
            return
        }

        val category = when (radioGroupCategory.checkedRadioButtonId) {
            R.id.radioMobile -> "TECHNICAL_MOBILE"
            R.id.radioWeb -> "TECHNICAL_WEB"
            R.id.radioWriting -> "WRITING"
            else -> "VSTEP"
        }

        val lines = rawContent.lines().map { it.trim() }.filter { it.isNotEmpty() }
        var importedCount = 0

        for (line in lines) {
            val parts = line.split("|").map { it.trim() }
            if (parts.size < 2) continue

            val word = parts[0]
            val sentence = parts.getOrNull(1).orEmpty()
            val vietnamese = parts.getOrNull(2).orEmpty()
            val grammar = parts.getOrNull(3).orEmpty()

            if (word.isEmpty()) continue

            val sentencesJson = ExampleUtils.sentencesToJson(listOf(sentence))
            val combinedExample = "$sentencesJson||$vietnamese||$grammar"

            onSave(word, listOf(combinedExample), category, grammar.ifEmpty { null })
            importedCount++
        }

        Logger.d("Bulk imported $importedCount vocabularies under category: $category")
        Toast.makeText(context, "✅ Đã nhập thành công $importedCount từ vựng!", Toast.LENGTH_SHORT).show()
        dismiss()
    }
}
