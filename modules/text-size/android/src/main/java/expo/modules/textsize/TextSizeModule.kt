package expo.modules.textsize

import android.content.res.Configuration
import android.content.res.Resources
import android.graphics.fonts.FontStyle
import android.os.Build
import androidx.activity.ComponentActivity
import androidx.core.util.Consumer
import com.facebook.react.uimanager.DisplayMetricsHolder
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * App-wide text size and bold text, independent of the system setting.
 *
 * Overrides `fontScale` / `fontWeightAdjustment` on the activity and application resources. Compose
 * (`@expo/ui`) reads them when a view is created, so JS remounts the tree after a change. Android resets
 * the resources on every configuration change (e.g. dark mode), so the override is re-applied then.
 */
class TextSizeModule : Module() {
  private var fontScale = 0f
  private var bold = false
  private var observed: ComponentActivity? = null
  private val onConfigurationChanged = Consumer<Configuration> { applyOverride() }

  override fun definition() = ModuleDefinition {
    Name("TextSize")

    /** `scale` 0 = follow the system. */
    AsyncFunction("apply") { scale: Double, boldText: Boolean ->
      fontScale = scale.toFloat()
      bold = boldText
      applyOverride()
    }.runOnQueue(Queues.MAIN)

    /** The device's own font scale, which native views such as the stack header still use. */
    Function("systemFontScale") { Resources.getSystem().configuration.fontScale.toDouble() }

    OnActivityEntersForeground { applyOverride() }

    OnDestroy {
      observed?.removeOnConfigurationChangedListener(onConfigurationChanged)
      observed = null
    }
  }

  private fun applyOverride() {
    val activity = appContext.currentActivity
    val app = appContext.reactContext?.applicationContext ?: activity?.applicationContext ?: return
    val system = Resources.getSystem().configuration

    listOfNotNull(activity?.resources, app.resources).distinct().forEach { res ->
      val config = Configuration(res.configuration)
      config.fontScale = if (fontScale > 0f) fontScale else system.fontScale
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        val boldAdjustment = FontStyle.FONT_WEIGHT_BOLD - FontStyle.FONT_WEIGHT_NORMAL
        config.fontWeightAdjustment = if (bold) boldAdjustment else system.fontWeightAdjustment
      }
      @Suppress("DEPRECATION")
      res.updateConfiguration(config, res.displayMetrics)
    }
    DisplayMetricsHolder.initDisplayMetrics(app)

    val component = activity as? ComponentActivity
    if (component != null && component != observed) {
      observed?.removeOnConfigurationChangedListener(onConfigurationChanged)
      component.addOnConfigurationChangedListener(onConfigurationChanged)
      observed = component
    }
  }
}
