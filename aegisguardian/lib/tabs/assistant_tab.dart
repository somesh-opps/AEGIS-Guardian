import 'package:flutter/material.dart';
import '../theme.dart';
import '../api_service.dart';

// ─── Models ───────────────────────────────────────────────────────────────────
class _Message {
  final bool isAi;
  final String text;
  final DateTime time;
  const _Message({required this.isAi, required this.text, required this.time});
}

class _ChatSession {
  final String id;
  final String title;
  final DateTime createdAt;
  final List<_Message> messages;
  _ChatSession({
    required this.id,
    required this.title,
    required this.createdAt,
    required this.messages,
  });
}

class AssistantTab extends StatefulWidget {
  const AssistantTab({super.key});

  @override
  State<AssistantTab> createState() => _AssistantTabState();
}

class _AssistantTabState extends State<AssistantTab>
    with TickerProviderStateMixin {
  final TextEditingController _ctrl = TextEditingController();
  final ScrollController _scroll = ScrollController();
  final FocusNode _focus = FocusNode();

  bool _isTyping = false;
  bool _drawerOpen = false;

  late AnimationController _dotCtrl;
  late AnimationController _drawerCtrl;
  late Animation<double> _drawerAnim;
  late Animation<double> _overlayAnim;

  List<_Message> _messages = [];
  final List<_ChatSession> _history = [];
  String? _currentSessionId;

  @override
  void initState() {
    super.initState();
    _dotCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..repeat(reverse: true);

    _drawerCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
    );
    _drawerAnim = CurvedAnimation(
      parent: _drawerCtrl,
      curve: Curves.easeOutCubic,
    );
    _overlayAnim = CurvedAnimation(parent: _drawerCtrl, curve: Curves.easeIn);
  }

  @override
  void dispose() {
    _ctrl.dispose();
    _scroll.dispose();
    _focus.dispose();
    _dotCtrl.dispose();
    _drawerCtrl.dispose();
    super.dispose();
  }

  // ─── Drawer helpers ──────────────────────────────────────────────────────────
  void _openDrawer() {
    _focus.unfocus();
    setState(() => _drawerOpen = true);
    _drawerCtrl.forward();
  }

  void _closeDrawer() {
    _drawerCtrl.reverse().then((_) {
      if (mounted) setState(() => _drawerOpen = false);
    });
  }

  // ─── Session management ──────────────────────────────────────────────────────
  void _saveCurrentSession() {
    if (_messages.isEmpty) return;
    final title = _messages
        .firstWhere((m) => !m.isAi, orElse: () => _messages.first)
        .text;
    final truncated = title.length > 40 ? '${title.substring(0, 40)}…' : title;

    if (_currentSessionId != null) {
      final idx = _history.indexWhere((s) => s.id == _currentSessionId);
      if (idx != -1) {
        _history[idx] = _ChatSession(
          id: _currentSessionId!,
          title: truncated,
          createdAt: _history[idx].createdAt,
          messages: List.from(_messages),
        );
        return;
      }
    }

    final session = _ChatSession(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      title: truncated,
      createdAt: DateTime.now(),
      messages: List.from(_messages),
    );
    _currentSessionId = session.id;
    _history.insert(0, session);
  }

  void _startNewChat() {
    _saveCurrentSession();
    setState(() {
      _messages = [];
      _currentSessionId = null;
      _isTyping = false;
    });
    _closeDrawer();
  }

  void _loadSession(_ChatSession session) {
    _saveCurrentSession();
    setState(() {
      _messages = List.from(session.messages);
      _currentSessionId = session.id;
      _isTyping = false;
    });
    _closeDrawer();
    _scrollToBottom();
  }

  void _deleteSession(String id) {
    setState(() {
      _history.removeWhere((s) => s.id == id);
      if (_currentSessionId == id) {
        _messages = [];
        _currentSessionId = null;
      }
    });
  }

  // ─── Chat logic ──────────────────────────────────────────────────────────────
  void _scrollToBottom() {
    Future.delayed(const Duration(milliseconds: 80), () {
      if (_scroll.hasClients) {
        _scroll.animateTo(
          _scroll.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  void _send() async {
    final text = _ctrl.text.trim();
    if (text.isEmpty || _isTyping) return;
    _ctrl.clear();
    _focus.unfocus();

    setState(() {
      _messages.add(_Message(isAi: false, text: text, time: DateTime.now()));
      _isTyping = true;
    });
    _scrollToBottom();

    final responseText = await ApiService.sendChatMessage(text);
    if (!mounted) return;

    setState(() {
      _isTyping = false;
      _messages.add(
        _Message(isAi: true, text: responseText ?? 'Unknown error occurred.', time: DateTime.now()),
      );
    });
    _saveCurrentSession();
    _scrollToBottom();
  }

  String _formatTime(DateTime t) {
    final h = t.hour.toString().padLeft(2, '0');
    final m = t.minute.toString().padLeft(2, '0');
    return '$h:$m';
  }

  String _formatDate(DateTime t) {
    final now = DateTime.now();
    final diff = now.difference(t).inDays;
    if (diff == 0) return 'Today';
    if (diff == 1) return 'Yesterday';
    return '${t.day}/${t.month}/${t.year}';
  }

  // ─── Build ───────────────────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    final mq = MediaQuery.of(context);
    final kb = mq.viewInsets.bottom;
    final bottomPad = kb > 0 ? kb + 12.0 : mq.padding.bottom + 24.0;

    return SafeArea(
      bottom: false,
      child: Stack(
        children: [
          // ── Main chat UI ──
          Column(
            children: [
              _buildTopBar(),
              Expanded(
                child: GestureDetector(
                  onTap: () {
                    _focus.unfocus();
                    if (_drawerOpen) _closeDrawer();
                  },
                  child: _messages.isEmpty && !_isTyping
                      ? const Center(child: SizedBox.shrink())
                      : ListView.builder(
                          controller: _scroll,
                          padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
                          itemCount: _messages.length + (_isTyping ? 1 : 0),
                          itemBuilder: (ctx, i) {
                            if (i < _messages.length)
                              return _buildBubble(_messages[i]);
                            return _buildTypingIndicator();
                          },
                        ),
                ),
              ),
              _buildInputBar(bottomPad),
            ],
          ),

          // ── Drawer overlay + panel ──
          if (_drawerOpen) ...[
            // Scrim
            FadeTransition(
              opacity: _overlayAnim,
              child: GestureDetector(
                onTap: _closeDrawer,
                child: Container(color: Colors.black.withOpacity(0.55)),
              ),
            ),
            // Slide-in panel
            SlideTransition(
              position: Tween<Offset>(
                begin: const Offset(-1, 0),
                end: Offset.zero,
              ).animate(_drawerAnim),
              child: _buildDrawerPanel(),
            ),
          ],
        ],
      ),
    );
  }

  // ─── Top bar ─────────────────────────────────────────────────────────────────
  Widget _buildTopBar() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          _iconButton(Icons.menu_rounded, _openDrawer),
          _iconButton(Icons.add_comment_outlined, _startNewChat),
        ],
      ),
    );
  }

  Widget _iconButton(IconData icon, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 42,
        height: 42,
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.07),
          shape: BoxShape.circle,
        ),
        child: Icon(icon, color: Colors.white, size: 20),
      ),
    );
  }

  // ─── Drawer panel ────────────────────────────────────────────────────────────
  Widget _buildDrawerPanel() {
    return Container(
      width: MediaQuery.of(context).size.width * 0.78,
      height: double.infinity,
      color: const Color(0xFF111111),
      child: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Drawer header
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 16, 8),
              child: Row(
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: AppColors.ai.withOpacity(0.15),
                      border: Border.all(color: AppColors.ai.withOpacity(0.4)),
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.ai.withOpacity(0.2),
                          blurRadius: 8,
                        ),
                      ],
                    ),
                    child: const Icon(
                      Icons.auto_awesome_rounded,
                      color: AppColors.ai,
                      size: 18,
                    ),
                  ),
                  const SizedBox(width: 10),
                  const Expanded(
                    child: Text(
                      'AEGIS Assistant',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  GestureDetector(
                    onTap: _closeDrawer,
                    child: const Icon(
                      Icons.close_rounded,
                      color: Colors.white38,
                      size: 22,
                    ),
                  ),
                ],
              ),
            ),

            // New Chat button
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
              child: GestureDetector(
                onTap: _startNewChat,
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  decoration: BoxDecoration(
                    color: AppColors.ai.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.ai.withOpacity(0.4)),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.ai.withOpacity(0.15),
                        blurRadius: 12,
                      ),
                    ],
                  ),
                  child: const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.add_rounded, color: AppColors.ai, size: 18),
                      SizedBox(width: 6),
                      Text(
                        'New Chat',
                        style: TextStyle(
                          color: AppColors.ai,
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),

            Divider(color: Colors.white.withOpacity(0.06), height: 1),
            const SizedBox(height: 4),

            // Section label
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 6),
              child: Text(
                'CHAT HISTORY',
                style: TextStyle(
                  fontSize: 10,
                  color: Colors.white38,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1.5,
                ),
              ),
            ),

            // History list
            Expanded(
              child: _history.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.history_rounded,
                            color: Colors.white12,
                            size: 40,
                          ),
                          const SizedBox(height: 10),
                          const Text(
                            'No chat history yet',
                            style: TextStyle(
                              color: Colors.white24,
                              fontSize: 13,
                            ),
                          ),
                        ],
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      itemCount: _history.length,
                      itemBuilder: (ctx, i) => _buildHistoryItem(_history[i]),
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHistoryItem(_ChatSession session) {
    final isActive = session.id == _currentSessionId;
    return Dismissible(
      key: Key(session.id),
      direction: DismissDirection.endToStart,
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 16),
        margin: const EdgeInsets.symmetric(vertical: 3),
        decoration: BoxDecoration(
          color: Colors.red.withOpacity(0.15),
          borderRadius: BorderRadius.circular(12),
        ),
        child: const Icon(
          Icons.delete_outline_rounded,
          color: Colors.redAccent,
          size: 20,
        ),
      ),
      onDismissed: (_) => _deleteSession(session.id),
      child: GestureDetector(
        onTap: () => _loadSession(session),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          margin: const EdgeInsets.symmetric(vertical: 3),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            color: isActive
                ? AppColors.ai.withOpacity(0.1)
                : Colors.white.withOpacity(0.04),
            borderRadius: BorderRadius.circular(12),
            border: isActive
                ? Border.all(color: AppColors.ai.withOpacity(0.35))
                : null,
            boxShadow: isActive
                ? [
                    BoxShadow(
                      color: AppColors.ai.withOpacity(0.1),
                      blurRadius: 8,
                    ),
                  ]
                : null,
          ),
          child: Row(
            children: [
              Icon(
                Icons.chat_bubble_outline_rounded,
                color: isActive ? AppColors.ai : Colors.white38,
                size: 16,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      session.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: isActive ? Colors.white : Colors.white70,
                        fontSize: 13,
                        fontWeight: isActive
                            ? FontWeight.w600
                            : FontWeight.w400,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      _formatDate(session.createdAt),
                      style: const TextStyle(
                        color: Colors.white24,
                        fontSize: 10,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ─── Chat bubble ─────────────────────────────────────────────────────────────
  Widget _buildBubble(_Message msg) {
    final isAi = msg.isAi;
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        mainAxisAlignment: isAi
            ? MainAxisAlignment.start
            : MainAxisAlignment.end,
        children: [
          if (isAi) ...[
            Container(
              width: 28,
              height: 28,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.ai.withOpacity(0.15),
                border: Border.all(color: AppColors.ai.withOpacity(0.4)),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.ai.withOpacity(0.2),
                    blurRadius: 8,
                  ),
                ],
              ),
              child: const Icon(
                Icons.auto_awesome_rounded,
                color: AppColors.ai,
                size: 14,
              ),
            ),
            const SizedBox(width: 8),
          ],
          Flexible(
            child: Column(
              crossAxisAlignment: isAi
                  ? CrossAxisAlignment.start
                  : CrossAxisAlignment.end,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 12,
                  ),
                  decoration: BoxDecoration(
                    color: isAi
                        ? const Color(0xFF1C1C1E)
                        : AppColors.ai.withOpacity(0.2),
                    borderRadius: BorderRadius.only(
                      topLeft: const Radius.circular(20),
                      topRight: const Radius.circular(20),
                      bottomLeft: Radius.circular(isAi ? 4 : 20),
                      bottomRight: Radius.circular(isAi ? 20 : 4),
                    ),
                    border: Border.all(
                      color: isAi
                          ? AppColors.ai.withOpacity(0.3)
                          : AppColors.ai.withOpacity(0.5),
                      width: 1,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.ai.withOpacity(0.08),
                        blurRadius: 10,
                      ),
                    ],
                  ),
                  child: Text(
                    msg.text,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 14,
                      height: 1.5,
                    ),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  _formatTime(msg.time),
                  style: const TextStyle(fontSize: 10, color: Colors.white24),
                ),
              ],
            ),
          ),
          if (!isAi) ...[
            const SizedBox(width: 8),
            Container(
              width: 28,
              height: 28,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white.withOpacity(0.1),
              ),
              child: const Icon(
                Icons.person_rounded,
                color: Colors.white60,
                size: 14,
              ),
            ),
          ],
        ],
      ),
    );
  }

  // ─── Typing indicator ─────────────────────────────────────────────────────────
  Widget _buildTypingIndicator() {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        children: [
          Container(
            width: 28,
            height: 28,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: AppColors.ai.withOpacity(0.15),
              border: Border.all(color: AppColors.ai.withOpacity(0.4)),
              boxShadow: [
                BoxShadow(color: AppColors.ai.withOpacity(0.2), blurRadius: 8),
              ],
            ),
            child: const Icon(
              Icons.auto_awesome_rounded,
              color: AppColors.ai,
              size: 14,
            ),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(
              color: const Color(0xFF1C1C1E),
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(20),
                topRight: Radius.circular(20),
                bottomRight: Radius.circular(20),
                bottomLeft: Radius.circular(4),
              ),
              border: Border.all(
                color: AppColors.ai.withOpacity(0.3),
                width: 1,
              ),
              boxShadow: [
                BoxShadow(
                  color: AppColors.ai.withOpacity(0.08),
                  blurRadius: 10,
                ),
              ],
            ),
            child: AnimatedBuilder(
              animation: _dotCtrl,
              builder: (_, __) => Row(
                mainAxisSize: MainAxisSize.min,
                children: List.generate(3, (i) {
                  final val = ((_dotCtrl.value + i * 0.33) % 1.0);
                  return Container(
                    margin: const EdgeInsets.symmetric(horizontal: 3),
                    width: 7,
                    height: 7,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: Colors.white.withOpacity(0.3 + 0.7 * val),
                    ),
                  );
                }),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ─── Input bar ───────────────────────────────────────────────────────────────
  Widget _buildInputBar(double bottomPad) {
    return Container(
      color: Colors.black,
      padding: EdgeInsets.fromLTRB(16, 10, 16, bottomPad),
      child: Row(
        children: [
          GestureDetector(
            onTap: () {},
            child: Container(
              width: 40,
              height: 40,
              margin: const EdgeInsets.only(right: 10),
              decoration: const BoxDecoration(
                color: Color(0xFF1C1C1E),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.add, color: Colors.white70, size: 20),
            ),
          ),
          Expanded(
            child: Container(
              height: 48,
              decoration: BoxDecoration(
                color: const Color(0xFF1C1C1E),
                borderRadius: BorderRadius.circular(28),
                border: Border.all(color: AppColors.ai.withOpacity(0.3)),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.ai.withOpacity(0.05),
                    blurRadius: 10,
                  ),
                ],
              ),
              child: TextField(
                controller: _ctrl,
                focusNode: _focus,
                style: const TextStyle(color: Colors.white, fontSize: 14),
                maxLines: 1,
                textInputAction: TextInputAction.send,
                onSubmitted: (_) => _send(),
                decoration: InputDecoration(
                  hintText: 'Ask AEGIS Guardian',
                  hintStyle: TextStyle(
                    color: Colors.white.withOpacity(0.3),
                    fontSize: 14,
                  ),
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 18,
                    vertical: 14,
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(width: 10),
          GestureDetector(
            onTap: _send,
            child: Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.ai.withOpacity(0.2),
                border: Border.all(color: AppColors.ai.withOpacity(0.5)),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.ai.withOpacity(0.15),
                    blurRadius: 8,
                  ),
                ],
              ),
              child: const Icon(
                Icons.arrow_upward_rounded,
                color: AppColors.ai,
                size: 20,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
