import 'dart:async';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'theme.dart';
import 'api_service.dart';
import 'splash_screen.dart';
import 'tabs/home_tab.dart';
import 'tabs/sos_tab.dart';
import 'tabs/live_update.dart';
import 'tabs/assistant_tab.dart';
import 'tabs/profile_tab.dart';
import 'tts_service.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await dotenv.load(fileName: ".env");
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'AEGIS Guardian',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.darkTheme,
      home: const SplashScreen(),
    );
  }
}

// ─── Campus alert level ───────────────────────────────────────────────────────
enum AlertLevel { safe, warning, danger }

class MyHomePage extends StatefulWidget {
  const MyHomePage({super.key, required this.title});
  final String title;

  @override
  State<MyHomePage> createState() => _MyHomePageState();
}

class _MyHomePageState extends State<MyHomePage> with TickerProviderStateMixin {
  int _selectedIndex = 0;
  AlertLevel _alertLevel = AlertLevel.safe;
  Timer? _alertTimer;


  late AnimationController _fabPulseController;
  late Animation<double> _fabPulseAnimation;

  // Per-item scale animation controllers
  late List<AnimationController> _itemControllers;
  late List<Animation<double>> _itemScales;

  static const _navItems = [
    _NavItemData(
      icon: Icons.home_rounded,
      label: 'Home',
      index: 0,
      isSos: false,
    ),
    _NavItemData(icon: Icons.sos_rounded, label: 'SOS', index: 1, isSos: true),
    _NavItemData(
      icon: Icons.auto_awesome_rounded,
      label: 'Assistant',
      index: 4,
      isSos: false,
    ),
    _NavItemData(
      icon: Icons.person_rounded,
      label: 'Profile',
      index: 3,
      isSos: false,
    ),
  ];

  @override
  void initState() {
    super.initState();

    // FAB pulse ring animation
    _fabPulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    )..repeat(reverse: false);

    _fabPulseAnimation = Tween<double>(begin: 0.85, end: 1.25).animate(
      CurvedAnimation(parent: _fabPulseController, curve: Curves.easeInOut),
    );

    // Per-nav-item scale animations
    _itemControllers = List.generate(
      _navItems.length,
      (i) => AnimationController(
        vsync: this,
        duration: const Duration(milliseconds: 220),
      ),
    );
    _itemScales = _itemControllers
        .map(
          (c) => Tween<double>(
            begin: 1.0,
            end: 1.22,
          ).animate(CurvedAnimation(parent: c, curve: Curves.easeOutBack)),
        )
        .toList();

    // Animate home selected by default
    _itemControllers[0].forward();

    // Start background polling for global alert level
    _startAlertPolling();
  }

  void _startAlertPolling() {
    _pollAlerts();
    _alertTimer = Timer.periodic(const Duration(seconds: 5), (_) {
      _pollAlerts();
    });
  }

  Future<void> _pollAlerts() async {
    try {
      final nodes = await ApiService.fetchAegisNodes();
      if (!mounted) return;
      
      bool hasDanger = false;
      bool hasWarning = false;
      String? alertRoom;

      for (final node in nodes) {
        final env = node['environment'] as Map<String, dynamic>? ?? {};
        final elec = node['electrical'] as Map<String, dynamic>? ?? {};
        
        final tempLabel = env['temperature_label'] as String? ?? 'NORMAL';
        final smokeLabel = env['smoke_label'] as String? ?? 'LOW';
        final gasLabel = env['gas_label'] as String? ?? 'LOW';
        final currentLabel = elec['current_label'] as String? ?? 'NORMAL';
        final flame = env['flame'] as bool? ?? false;
        final panic = node['panic_button'] as bool? ?? false;

        if (flame || panic || smokeLabel == 'HIGH') {
          hasDanger = true;
          alertRoom = node['room'] as String?;
          break; // danger is max level
        } else if (gasLabel == 'HIGH' || currentLabel == 'ABNORMAL' || tempLabel == 'HIGH') {
          hasWarning = true;
          alertRoom ??= node['room'] as String?;
        }
      }

      final newLevel = hasDanger ? AlertLevel.danger : (hasWarning ? AlertLevel.warning : AlertLevel.safe);
      
      if (_alertLevel != newLevel) {
        final roomText = alertRoom != null ? ' in $alertRoom' : ' on campus';
        if (newLevel == AlertLevel.danger) {
          TtsService.announce("Danger detected$roomText. If you are there, please evacuate the room.");
        } else if (newLevel == AlertLevel.warning) {
          TtsService.announce("Warning detected$roomText. If you are there, please evacuate the room.");
        }
        
        setState(() {
          _alertLevel = newLevel;
          // Adjust pulse speed
          _fabPulseController.duration = switch (_alertLevel) {
            AlertLevel.safe => const Duration(milliseconds: 1800),
            AlertLevel.warning => const Duration(milliseconds: 900),
            AlertLevel.danger => const Duration(milliseconds: 400),
          };
        });
      }
    } catch (e) {
      debugPrint('Error polling alerts in main: $e');
    }
  }

  @override
  void dispose() {
    _alertTimer?.cancel();
    _fabPulseController.dispose();
    for (final c in _itemControllers) {
      c.dispose();
    }
    super.dispose();
  }

  void _onNavTap(int index, int controllerIndex) {
    if (_selectedIndex == index) return;
    // Reverse old selection
    final oldController = _itemControllers
        .asMap()
        .entries
        .firstWhere(
          (e) => _navItems[e.key].index == _selectedIndex,
          orElse: () => MapEntry(0, _itemControllers[0]),
        )
        .value;
    oldController.reverse();

    _itemControllers[controllerIndex].forward();
    setState(() {
      _selectedIndex = index;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      resizeToAvoidBottomInset: false,
      extendBody: true,
      body: _buildBody(),
      floatingActionButton: _buildFab(),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
      bottomNavigationBar: _buildBottomBar(),
    );
  }

  // ─── Alert level helpers ──────────────────────────────────────────────────
  Color get _alertColor {
    switch (_alertLevel) {
      case AlertLevel.safe:
        return const Color(0xFF00E676);
      case AlertLevel.warning:
        return const Color(0xFFFFD600);
      case AlertLevel.danger:
        return const Color(0xFFFF1744);
    }
  }

  List<Color> get _alertGradient {
    switch (_alertLevel) {
      case AlertLevel.safe:
        return [const Color(0xFF00C853), const Color(0xFF006430)];
      case AlertLevel.warning:
        return [const Color(0xFFFFD600), const Color(0xFF7A5F00)];
      case AlertLevel.danger:
        return [const Color(0xFFFF1744), const Color(0xFF7A0020)];
    }
  }

  IconData get _alertIcon {
    switch (_alertLevel) {
      case AlertLevel.safe:
        return Icons.shield_rounded;
      case AlertLevel.warning:
        return Icons.warning_amber_rounded;
      case AlertLevel.danger:
        return Icons.crisis_alert_rounded;
    }
  }

  String get _alertLabel {
    switch (_alertLevel) {
      case AlertLevel.safe:
        return 'SAFE';
      case AlertLevel.warning:
        return 'WARN';
      case AlertLevel.danger:
        return 'DANGER';
    }
  }

  Widget _buildFab() {
    final isActive = _selectedIndex == 2;
    final glowColor = _alertColor;

    return GestureDetector(
      onTap: () {
        if (_selectedIndex != 2) {
          final oldEntry = _navItems.asMap().entries.firstWhere(
            (e) => e.value.index == _selectedIndex,
            orElse: () => const MapEntry(
              0,
              _NavItemData(
                icon: Icons.home_rounded,
                label: 'Home',
                index: 0,
                isSos: false,
              ),
            ),
          );
          _itemControllers[oldEntry.key].reverse();
        }
        setState(() => _selectedIndex = 2);
      },
      child: AnimatedBuilder(
        animation: _fabPulseAnimation,
        builder: (context, child) {
          return Stack(
            alignment: Alignment.center,
            children: [
              // Outer pulse ring
              Transform.scale(
                scale: _fabPulseAnimation.value,
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 400),
                  width: 78,
                  height: 78,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: glowColor.withOpacity(
                        0.50 * (1 - (_fabPulseAnimation.value - 0.85) / 0.4),
                      ),
                      width: 2,
                    ),
                  ),
                ),
              ),
              // Glow halo
              AnimatedContainer(
                duration: const Duration(milliseconds: 400),
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: glowColor.withOpacity(isActive ? 0.60 : 0.35),
                      blurRadius: _alertLevel == AlertLevel.danger
                          ? 36
                          : _alertLevel == AlertLevel.warning
                          ? 26
                          : 20,
                      spreadRadius: _alertLevel == AlertLevel.danger ? 6 : 3,
                    ),
                  ],
                ),
              ),
              // FAB button
              AnimatedContainer(
                duration: const Duration(milliseconds: 400),
                curve: Curves.easeInOut,
                width: 62,
                height: 62,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: _alertGradient,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: glowColor.withOpacity(0.5),
                      blurRadius: 12,
                      spreadRadius: 1,
                    ),
                  ],
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    AnimatedSwitcher(
                      duration: const Duration(milliseconds: 300),
                      transitionBuilder: (child, anim) =>
                          ScaleTransition(scale: anim, child: child),
                      child: Icon(
                        _alertIcon,
                        key: ValueKey(_alertLevel),
                        color: Colors.white,
                        size: 26,
                      ),
                    ),
                    const SizedBox(height: 2),
                    AnimatedSwitcher(
                      duration: const Duration(milliseconds: 300),
                      child: Text(
                        _alertLabel,
                        key: ValueKey(_alertLabel),
                        style: const TextStyle(
                          fontSize: 7,
                          color: Colors.white70,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildBottomBar() {
    return ClipRRect(
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
        child: Container(
          decoration: BoxDecoration(
            color: Colors.black.withOpacity(0.90),
            border: Border(
              top: BorderSide(color: AppColors.ai.withOpacity(0.18), width: 1),
            ),
            boxShadow: [
              BoxShadow(
                color: AppColors.ai.withOpacity(0.07),
                blurRadius: 30,
                offset: const Offset(0, -4),
              ),
            ],
          ),
          child: SafeArea(
            top: false,
            child: SizedBox(
              height: 75,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _buildNavItem(_navItems[0], 0),
                  _buildNavItem(_navItems[1], 1),
                  const SizedBox(width: 56), // Space for FAB
                  _buildNavItem(_navItems[2], 2),
                  _buildNavItem(_navItems[3], 3),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem(_NavItemData item, int controllerIndex) {
    final isSelected = _selectedIndex == item.index;
    final activeColor = item.isSos ? AppColors.critical : AppColors.ai;

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () => _onNavTap(item.index, controllerIndex),
      child: SizedBox(
        width: 64,
        child: AnimatedBuilder(
          animation: _itemScales[controllerIndex],
          builder: (context, child) {
            return Transform.scale(
              scale: isSelected ? _itemScales[controllerIndex].value : 1.0,
              child: child,
            );
          },
          child: Column(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Glowing icon container
              AnimatedContainer(
                duration: const Duration(milliseconds: 250),
                curve: Curves.easeInOut,
                width: 38,
                height: 26,
                decoration: isSelected
                    ? BoxDecoration(
                        borderRadius: BorderRadius.circular(8),
                        gradient: LinearGradient(
                          colors: item.isSos
                              ? [
                                  AppColors.critical.withOpacity(0.22),
                                  AppColors.critical.withOpacity(0.08),
                                ]
                              : [
                                  AppColors.ai.withOpacity(0.22),
                                  AppColors.ai.withOpacity(0.08),
                                ],
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: activeColor.withOpacity(0.40),
                            blurRadius: 12,
                            spreadRadius: 1,
                          ),
                        ],
                      )
                    : null,
                child: Icon(
                  item.icon,
                  color: isSelected ? activeColor : const Color(0xFF5C6B7A),
                  size: 20,
                ),
              ),
              const SizedBox(height: 2),
              // Label with animated color
              AnimatedDefaultTextStyle(
                duration: const Duration(milliseconds: 250),
                style: TextStyle(
                  color: isSelected ? activeColor : const Color(0xFF5C6B7A),
                  fontSize: 9,
                  fontWeight: isSelected ? FontWeight.w700 : FontWeight.w400,
                  letterSpacing: isSelected ? 0.4 : 0.0,
                ),
                child: Text(item.label),
              ),
              // Active indicator dot
              AnimatedContainer(
                duration: const Duration(milliseconds: 250),
                curve: Curves.easeInOut,
                margin: const EdgeInsets.only(top: 2),
                width: isSelected ? 16 : 0,
                height: 2,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(2),
                  color: isSelected ? activeColor : Colors.transparent,
                  boxShadow: isSelected
                      ? [
                          BoxShadow(
                            color: activeColor.withOpacity(0.7),
                            blurRadius: 6,
                            spreadRadius: 1,
                          ),
                        ]
                      : [],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBody() {
    switch (_selectedIndex) {
      case 0:
        return const HomeTab();
      case 1:
        return const SosTab();
      case 2:
        return const LiveUpdateTab();
      case 3:
        return const ProfileTab();
      case 4:
        return const AssistantTab();
      default:
        return const HomeTab();
    }
  }
}

// ─── Data model ───────────────────────────────────────────────────────────────
class _NavItemData {
  final IconData icon;
  final String label;
  final int index;
  final bool isSos;
  const _NavItemData({
    required this.icon,
    required this.label,
    required this.index,
    required this.isSos,
  });
}
