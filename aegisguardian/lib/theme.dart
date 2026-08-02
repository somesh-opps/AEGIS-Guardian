import 'package:flutter/material.dart';

class AppColors {
  // Background & Surface
  static const Color background = Colors.black;
  static const Color card = Color(0xFF1C1C1E);

  // Status & Accents
  static const Color safe = Colors.green;
  static const Color warning = Colors.amber;
  static const Color critical = Colors.red;
  static const Color ai = Colors.cyan;

  // Text
  static const Color textPrimary = Colors.white;
}

class AppTheme {
  static ThemeData get darkTheme {
    return ThemeData(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: AppColors.background,
      primaryColor: AppColors.ai,
      cardColor: AppColors.card,

      // Color Scheme
      colorScheme: const ColorScheme.dark(
        primary: AppColors.ai,
        secondary: AppColors.safe,
        surface: AppColors.card,
        background: AppColors.background,
        error: AppColors.critical,
        onPrimary: AppColors.textPrimary,
        onSecondary: AppColors.textPrimary,
        onSurface: AppColors.textPrimary,
        onBackground: AppColors.textPrimary,
        onError: AppColors.textPrimary,
      ),

      // AppBar Theme
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.card,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
      ),

      // Card Theme
      cardTheme: CardThemeData(
        color: AppColors.card,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),

      // Text Theme
      textTheme: const TextTheme(
        bodyLarge: TextStyle(color: AppColors.textPrimary),
        bodyMedium: TextStyle(color: AppColors.textPrimary),
        titleLarge: TextStyle(color: AppColors.textPrimary),
      ),

      // Icon Theme
      iconTheme: const IconThemeData(color: AppColors.textPrimary),
    );
  }
}
