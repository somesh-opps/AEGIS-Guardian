import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../theme.dart';
import '../api_service.dart';

class SosTab extends StatefulWidget {
  const SosTab({super.key});

  @override
  State<SosTab> createState() => _SosTabState();
}

// ─── Route data ──────────────────────────────────────────────────────────────
class _RouteStep {
  final IconData icon;
  final String instruction;
  const _RouteStep(this.icon, this.instruction);
}

Map<String, List<_RouteStep>> _locationRoutes = {
  'A-GF: Electrical Room': [
    const _RouteStep(Icons.exit_to_app_rounded, 'Exit Electrical Room and turn right.'),
    const _RouteStep(Icons.stairs_rounded, 'Proceed to the main exit.'),
    const _RouteStep(Icons.check_circle_rounded, 'Reach Assembly Point A.'),
  ],
  'A-GF: Server Room': [
    const _RouteStep(Icons.exit_to_app_rounded, 'Exit Server Room and turn left.'),
    const _RouteStep(Icons.stairs_rounded, 'Proceed to the main exit.'),
    const _RouteStep(Icons.check_circle_rounded, 'Reach Assembly Point A.'),
  ],
  'A-1F: Class Room': [
    const _RouteStep(Icons.exit_to_app_rounded, 'Exit Class Room and turn right.'),
    const _RouteStep(Icons.stairs_rounded, 'Take stairs down to ground floor.'),
    const _RouteStep(Icons.check_circle_rounded, 'Reach Assembly Point A.'),
  ],
  'A-1F: Faculty Room': [
    const _RouteStep(Icons.exit_to_app_rounded, 'Exit Faculty Room and turn left.'),
    const _RouteStep(Icons.stairs_rounded, 'Take stairs down to ground floor.'),
    const _RouteStep(Icons.check_circle_rounded, 'Reach Assembly Point A.'),
  ],
  'B-GF: Chemistry Room': [
    const _RouteStep(Icons.exit_to_app_rounded, 'Exit Chemistry Room and head to the rear exit.'),
    const _RouteStep(Icons.check_circle_rounded, 'Reach Assembly Point B.'),
  ],
  'B-GF: Control Room': [
    const _RouteStep(Icons.exit_to_app_rounded, 'Exit Control Room and head to the front exit.'),
    const _RouteStep(Icons.check_circle_rounded, 'Reach Assembly Point B.'),
  ],
  'B-1F: Seminar Hall': [
    const _RouteStep(Icons.exit_to_app_rounded, 'Exit Seminar Hall and turn right.'),
    const _RouteStep(Icons.stairs_rounded, 'Take stairs down to ground floor.'),
    const _RouteStep(Icons.check_circle_rounded, 'Reach Assembly Point B.'),
  ],
  'B-1F: Office': [
    const _RouteStep(Icons.exit_to_app_rounded, 'Exit Office and turn left.'),
    const _RouteStep(Icons.stairs_rounded, 'Take stairs down to ground floor.'),
    const _RouteStep(Icons.check_circle_rounded, 'Reach Assembly Point B.'),
  ],
};
Map<String, bool> _locationSafe = {
  'A-GF: Electrical Room': true,
  'A-GF: Server Room': true,
  'A-1F: Class Room': true,
  'A-1F: Faculty Room': true,
  'B-GF: Chemistry Room': true,
  'B-GF: Control Room': true,
  'B-1F: Seminar Hall': true,
  'B-1F: Office': true,
};

class _SosTabState extends State<SosTab> with TickerProviderStateMixin {
  bool _sosActive = false;
  int _holdProgress = 0; // 0–100
  bool _holding = false;

  // Location picker state
  String? _selectedFloor;
  String? _selectedLocation;

  List<String> _floors = [
    'Building A - Ground Floor',
    'Building A - First Floor',
    'Building B - Ground Floor',
    'Building B - First Floor',
  ];
  Map<String, String> _floorPrefixes = {
    'Building A - Ground Floor': 'A-GF: ',
    'Building A - First Floor': 'A-1F: ',
    'Building B - Ground Floor': 'B-GF: ',
    'Building B - First Floor': 'B-1F: ',
  };

  late AnimationController _ringController;
  late AnimationController _pulseController;
  late AnimationController _flashController;
  late Animation<double> _ringAnim;
  late Animation<double> _pulseAnim;
  late Animation<double> _flashAnim;

  @override
  void initState() {
    super.initState();

    _ringController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1800),
    )..repeat();

    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..repeat(reverse: true);

    _flashController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 500),
    );

    _ringAnim = Tween<double>(
      begin: 0,
      end: 1,
    ).animate(CurvedAnimation(parent: _ringController, curve: Curves.easeOut));

    _pulseAnim = Tween<double>(begin: 0.92, end: 1.08).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );

    _flashAnim = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(parent: _flashController, curve: Curves.easeInOut),
    );

    ApiService.fetchSosData().then((data) {
      if (!mounted) return;
      setState(() {}); // trigger rebuild
    });
  }

  @override
  void dispose() {
    _ringController.dispose();
    _pulseController.dispose();
    _flashController.dispose();
    super.dispose();
  }

  void _activateSOS() {
    HapticFeedback.heavyImpact();
    setState(() => _sosActive = true);
    _flashController.forward(from: 0).then((_) => _flashController.reverse());
    _pulseController.duration = const Duration(milliseconds: 400);
  }

  void _cancelSOS() {
    HapticFeedback.mediumImpact();
    setState(() {
      _sosActive = false;
      _holdProgress = 0;
    });
    _pulseController.duration = const Duration(milliseconds: 900);
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _flashAnim,
      builder: (_, child) {
        return Container(
          color: _sosActive
              ? Color.lerp(
                  AppColors.background,
                  AppColors.critical.withOpacity(0.08),
                  _flashAnim.value,
                )
              : AppColors.background,
          child: child,
        );
      },
      child: SafeArea(
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 100),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildHeader(),
              const SizedBox(height: 32),
              _buildSosButton(),
              const SizedBox(height: 28),
              if (_sosActive) _buildActiveAlertBanner(),
              if (_sosActive) const SizedBox(height: 20),
              _buildQuickActions(),
              const SizedBox(height: 24),
              _buildRouteFinder(),
            ],
          ),
        ),
      ),
    );
  }

  // ─── Header ────────────────────────────────────────────────────────────────
  Widget _buildHeader() {
    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              AnimatedDefaultTextStyle(
                duration: const Duration(milliseconds: 300),
                style: TextStyle(
                  fontSize: 11,
                  color: _sosActive ? AppColors.critical : Colors.white38,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 2,
                ),
                child: Text(
                  _sosActive ? '⚠  EMERGENCY ACTIVE' : 'EMERGENCY RESPONSE',
                ),
              ),
              const SizedBox(height: 6),
              const Text(
                'SOS Center',
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.w800,
                  color: Colors.white,
                  letterSpacing: -0.5,
                ),
              ),
            ],
          ),
        ),
        // Status chip
        AnimatedContainer(
          duration: const Duration(milliseconds: 300),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: (_sosActive ? AppColors.critical : AppColors.safe)
                .withOpacity(0.12),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: (_sosActive ? AppColors.critical : AppColors.safe)
                  .withOpacity(0.35),
              width: 1,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              AnimatedBuilder(
                animation: _pulseAnim,
                builder: (_, __) => Transform.scale(
                  scale: _pulseAnim.value,
                  child: Container(
                    width: 7,
                    height: 7,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: _sosActive ? AppColors.critical : AppColors.safe,
                      boxShadow: [
                        BoxShadow(
                          color:
                              (_sosActive ? AppColors.critical : AppColors.safe)
                                  .withOpacity(0.7),
                          blurRadius: 6,
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 6),
              Text(
                _sosActive ? 'ALERT' : 'STANDBY',
                style: TextStyle(
                  fontSize: 11,
                  color: _sosActive ? AppColors.critical : AppColors.safe,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  // ─── SOS Button ────────────────────────────────────────────────────────────
  Widget _buildSosButton() {
    return Center(
      child: SizedBox(
        width: 260,
        height: 260,
        child: AnimatedBuilder(
          animation: Listenable.merge([_ringAnim, _pulseAnim]),
          builder: (_, __) {
            return Stack(
              alignment: Alignment.center,
              children: [
                // Outer expanding ring
                Transform.scale(
                  scale: 0.7 + (_ringAnim.value * 0.55),
                  child: Opacity(
                    opacity: (1 - _ringAnim.value).clamp(0, 1),
                    child: Container(
                      width: 260,
                      height: 260,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: AppColors.critical.withOpacity(0.6),
                          width: 2,
                        ),
                      ),
                    ),
                  ),
                ),
                // Second ring (offset phase)
                Transform.scale(
                  scale: 0.55 + ((((_ringAnim.value + 0.5) % 1.0)) * 0.55),
                  child: Opacity(
                    opacity: (1 - ((_ringAnim.value + 0.5) % 1.0)).clamp(0, 1),
                    child: Container(
                      width: 260,
                      height: 260,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: AppColors.critical.withOpacity(0.35),
                          width: 1.5,
                        ),
                      ),
                    ),
                  ),
                ),
                // Glow halo
                Container(
                  width: 180,
                  height: 180,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.critical.withOpacity(
                          _sosActive ? 0.5 * _pulseAnim.value : 0.20,
                        ),
                        blurRadius: _sosActive ? 48 : 28,
                        spreadRadius: _sosActive ? 12 : 4,
                      ),
                    ],
                  ),
                ),
                // Main button
                GestureDetector(
                  onTap: _sosActive ? null : _activateSOS,
                  onLongPress: _sosActive ? null : _activateSOS,
                  child: Transform.scale(
                    scale: _sosActive ? _pulseAnim.value : 1.0,
                    child: Container(
                      width: 168,
                      height: 168,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: RadialGradient(
                          colors: _sosActive
                              ? [
                                  const Color(0xFFFF1744),
                                  const Color(0xFF8B0000),
                                ]
                              : [
                                  const Color(0xFFB71C1C),
                                  const Color(0xFF4A0000),
                                ],
                          center: const Alignment(-0.3, -0.4),
                        ),
                        border: Border.all(
                          color: AppColors.critical.withOpacity(0.5),
                          width: 2,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.critical.withOpacity(
                              _sosActive ? 0.6 : 0.3,
                            ),
                            blurRadius: 20,
                            spreadRadius: 2,
                          ),
                        ],
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            _sosActive
                                ? Icons.campaign_rounded
                                : Icons.sos_rounded,
                            color: Colors.white,
                            size: 52,
                          ),
                          const SizedBox(height: 6),
                          Text(
                            _sosActive ? 'SENDING\nALERT' : 'HOLD TO\nACTIVATE',
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              fontSize: 12,
                              color: Colors.white70,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 1.2,
                              height: 1.4,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  // ─── Active Alert Banner ────────────────────────────────────────────────────
  Widget _buildActiveAlertBanner() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        color: AppColors.critical.withOpacity(0.08),
        border: Border.all(
          color: AppColors.critical.withOpacity(0.35),
          width: 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.campaign_rounded, color: AppColors.critical, size: 20),
              const SizedBox(width: 8),
              const Text(
                'EMERGENCY ALERT DISPATCHED',
                style: TextStyle(
                  fontSize: 13,
                  color: AppColors.critical,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0.8,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'Security teams have been notified. Help is on the way. Stay calm and remain at your location.',
            style: TextStyle(fontSize: 13, color: Colors.white60, height: 1.5),
          ),
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: _cancelSOS,
              icon: const Icon(Icons.cancel_rounded, size: 16),
              label: const Text('Cancel Alert'),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.critical,
                side: BorderSide(color: AppColors.critical.withOpacity(0.5)),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                padding: const EdgeInsets.symmetric(vertical: 12),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ─── Quick Actions ──────────────────────────────────────────────────────────
  Widget _buildQuickActions() {
    final actions = [
      _QuickAction(
        Icons.local_fire_department_rounded,
        'Fire',
        const Color(0xFFFF6D00),
      ),
      _QuickAction(
        Icons.medical_services_rounded,
        'Medical',
        Colors.blueAccent,
      ),
      _QuickAction(Icons.security_rounded, 'Security', const Color(0xFFAB47BC)),
      _QuickAction(Icons.warning_amber_rounded, 'Hazard', AppColors.warning),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Quick Alert Type',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w700,
            color: Colors.white,
          ),
        ),
        const SizedBox(height: 12),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: actions.map((a) => _buildQuickActionTile(a)).toList(),
        ),
      ],
    );
  }

  Widget _buildQuickActionTile(_QuickAction action) {
    return Expanded(
      child: GestureDetector(
        onTap: () {
          HapticFeedback.heavyImpact();
          // Trigger the main SOS sequence
          _activateSOS();
        },
        child: Container(
          margin: const EdgeInsets.symmetric(horizontal: 4),
          padding: const EdgeInsets.symmetric(vertical: 14),
          decoration: BoxDecoration(
            color: AppColors.card,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: action.color.withOpacity(0.2), width: 1),
          ),
          child: Column(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: action.color.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(action.icon, color: action.color, size: 20),
              ),
              const SizedBox(height: 8),
              Text(
                action.label,
                style: const TextStyle(
                  fontSize: 11,
                  color: Colors.white60,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ─── Route Finder ─────────────────────────────────────────────────────────────
  Widget _buildRouteFinder() {
    final hasRoute = _selectedLocation != null;
    final steps = hasRoute
        ? _locationRoutes[_selectedLocation!]!
        : <_RouteStep>[];
    final isSafe = hasRoute
        ? (_locationSafe[_selectedLocation!] ?? true)
        : null;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Tell Us Where You Are',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w700,
            color: Colors.white,
          ),
        ),
        const SizedBox(height: 12),
        // Dynamic Dropdown (Floors then Rooms)
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
          decoration: BoxDecoration(
            color: AppColors.card,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: hasRoute
                  ? (isSafe == true
                        ? const Color(0xFF69FF47).withOpacity(0.4)
                        : AppColors.critical.withOpacity(0.5))
                  : Colors.white.withOpacity(0.12),
              width: 1,
            ),
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              value: _selectedFloor == null ? null : _selectedLocation,
              hint: Row(
                children: [
                  Icon(
                    _selectedFloor == null
                        ? Icons.apartment_rounded
                        : Icons.meeting_room_rounded,
                    color: Colors.white38,
                    size: 18,
                  ),
                  const SizedBox(width: 10),
                  Text(
                    _selectedFloor == null
                        ? 'Select your floor…'
                        : 'Select your room…',
                    style: const TextStyle(color: Colors.white38, fontSize: 14),
                  ),
                ],
              ),
              dropdownColor: const Color(0xFF1A2330),
              icon: const Icon(
                Icons.expand_more_rounded,
                color: Colors.white38,
              ),
              isExpanded: true,
              style: const TextStyle(color: Colors.white, fontSize: 14),
              items: _selectedFloor == null
                  ? _floors.map((floor) {
                      return DropdownMenuItem<String>(
                        value: floor,
                        child: Text(floor),
                      );
                    }).toList()
                  : [
                      const DropdownMenuItem<String>(
                        value: '__BACK__',
                        child: Row(
                          children: [
                            Icon(
                              Icons.arrow_back_rounded,
                              color: Colors.white60,
                              size: 16,
                            ),
                            SizedBox(width: 10),
                            Text(
                              '← Change Floor',
                              style: TextStyle(color: Colors.white60),
                            ),
                          ],
                        ),
                      ),
                      ..._locationRoutes.keys
                          .where(
                            (loc) =>
                                loc.startsWith(_floorPrefixes[_selectedFloor]!),
                          )
                          .map((loc) {
                            final safe = _locationSafe[loc] ?? true;
                            final roomName = loc.substring(
                              _floorPrefixes[_selectedFloor]!.length,
                            );
                            return DropdownMenuItem<String>(
                              value: loc,
                              child: Row(
                                children: [
                                  Icon(
                                    safe
                                        ? Icons.check_circle_rounded
                                        : Icons.warning_amber_rounded,
                                    color: safe
                                        ? const Color(0xFF69FF47)
                                        : AppColors.warning,
                                    size: 16,
                                  ),
                                  const SizedBox(width: 10),
                                  Text(roomName),
                                ],
                              ),
                            );
                          }),
                    ],
              onChanged: (val) {
                if (_selectedFloor == null) {
                  setState(() {
                    _selectedFloor = val;
                    _selectedLocation = null;
                  });
                } else {
                  if (val == '__BACK__') {
                    setState(() {
                      _selectedFloor = null;
                      _selectedLocation = null;
                    });
                  } else {
                    setState(() {
                      _selectedLocation = val;
                    });
                  }
                }
              },
            ),
          ),
        ),
        // ── Safety status banner ──────────────────────────────────────────
        if (hasRoute) ...[
          const SizedBox(height: 14),
          AnimatedContainer(
            duration: const Duration(milliseconds: 350),
            curve: Curves.easeOut,
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(18),
              color: isSafe == true
                  ? const Color(0xFF69FF47).withOpacity(0.08)
                  : AppColors.critical.withOpacity(0.10),
              border: Border.all(
                color: isSafe == true
                    ? const Color(0xFF69FF47).withOpacity(0.35)
                    : AppColors.critical.withOpacity(0.45),
                width: 1,
              ),
              boxShadow: [
                BoxShadow(
                  color: isSafe == true
                      ? const Color(0xFF69FF47).withOpacity(0.06)
                      : AppColors.critical.withOpacity(0.08),
                  blurRadius: 16,
                ),
              ],
            ),
            child: Row(
              children: [
                Container(
                  width: 46,
                  height: 46,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: isSafe == true
                        ? const Color(0xFF69FF47).withOpacity(0.14)
                        : AppColors.critical.withOpacity(0.14),
                  ),
                  child: Icon(
                    isSafe == true
                        ? Icons.verified_user_rounded
                        : Icons.gpp_bad_rounded,
                    color: isSafe == true
                        ? const Color(0xFF69FF47)
                        : AppColors.critical,
                    size: 24,
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        isSafe == true
                            ? 'You are SAFE'
                            : 'DANGER — Evacuate Now',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w800,
                          color: isSafe == true
                              ? const Color(0xFF69FF47)
                              : AppColors.critical,
                          letterSpacing: 0.3,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        isSafe == true
                            ? 'Your location is clear. Follow the exit route below as a precaution.'
                            : 'Your location is flagged. Use the alternate evacuation route below immediately.',
                        style: const TextStyle(
                          fontSize: 11,
                          color: Colors.white54,
                          height: 1.45,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
        // Route card
        if (hasRoute) ...[
          const SizedBox(height: 14),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(20),
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [const Color(0xFF002A10), const Color(0xFF001A0A)],
              ),
              border: Border.all(
                color: const Color(0xFF69FF47).withOpacity(0.3),
                width: 1,
              ),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF69FF47).withOpacity(0.08),
                  blurRadius: 20,
                  offset: const Offset(0, 6),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: const Color(0xFF69FF47).withOpacity(0.12),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(
                        Icons.route_rounded,
                        color: Color(0xFF69FF47),
                        size: 18,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Evacuation Route',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                              color: Colors.white,
                            ),
                          ),
                          Text(
                            'From: $_selectedLocation',
                            style: const TextStyle(
                              fontSize: 11,
                              color: Colors.white38,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFF69FF47).withOpacity(0.12),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: const Color(0xFF69FF47).withOpacity(0.4),
                        ),
                      ),
                      child: Text(
                        '${steps.length} Steps',
                        style: const TextStyle(
                          fontSize: 10,
                          color: Color(0xFF69FF47),
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 18),
                ...List.generate(steps.length, (i) {
                  final step = steps[i];
                  final isLast = i == steps.length - 1;
                  return Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Timeline column
                      Column(
                        children: [
                          Container(
                            width: 32,
                            height: 32,
                            decoration: BoxDecoration(
                              color: isLast
                                  ? const Color(0xFF69FF47).withOpacity(0.2)
                                  : const Color(0xFF69FF47).withOpacity(0.10),
                              shape: BoxShape.circle,
                              border: Border.all(
                                color: const Color(
                                  0xFF69FF47,
                                ).withOpacity(isLast ? 0.7 : 0.35),
                              ),
                            ),
                            child: Icon(
                              step.icon,
                              color: const Color(0xFF69FF47),
                              size: 15,
                            ),
                          ),
                          if (!isLast)
                            Container(
                              width: 1,
                              height: 28,
                              margin: const EdgeInsets.symmetric(vertical: 3),
                              color: const Color(0xFF69FF47).withOpacity(0.2),
                            ),
                        ],
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Padding(
                          padding: const EdgeInsets.only(top: 7, bottom: 14),
                          child: Text(
                            step.instruction,
                            style: TextStyle(
                              fontSize: 13,
                              color: isLast
                                  ? const Color(0xFF69FF47)
                                  : Colors.white70,
                              fontWeight: isLast
                                  ? FontWeight.w700
                                  : FontWeight.w400,
                              height: 1.4,
                            ),
                          ),
                        ),
                      ),
                    ],
                  );
                }),
              ],
            ),
          ),
        ],
      ],
    );
  }
}

// ─── Data Models ─────────────────────────────────────────────────────────────

class _QuickAction {
  final IconData icon;
  final String label;
  final Color color;
  const _QuickAction(this.icon, this.label, this.color);
}
