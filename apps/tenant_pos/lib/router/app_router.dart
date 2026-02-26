import 'package:go_router/go_router.dart';

import '../screens/login_screen.dart';
import '../screens/home_screen.dart';

// App router instance
final appRouter = GoRouter(
  initialLocation: '/login',
  routes: [
    GoRoute(
      path: '/login',
      builder: (context, state) => const LoginScreen(),
    ),
    GoRoute(
      path: '/',
      builder: (context, state) => const HomeScreen(),
    ),
  ],
);
