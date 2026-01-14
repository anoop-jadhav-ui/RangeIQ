import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:nexon_ev_range/config/theme.dart';
import 'package:nexon_ev_range/config/routes.dart';
import 'package:nexon_ev_range/services/storage/local_storage_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize local storage
  await LocalStorageService.initialize();
  
  runApp(
    const ProviderScope(
      child: NexonEVRangeApp(),
    ),
  );
}

class NexonEVRangeApp extends StatelessWidget {
  const NexonEVRangeApp({super.key});

  @override
  Widget build(BuildContext context) {
    return CupertinoApp(
      title: 'Nexon EV Range',
      debugShowCheckedModeBanner: false,
      theme: NexonEVTheme.light,
      darkTheme: NexonEVTheme.dark,
      initialRoute: AppRoutes.dashboard,
      onGenerateRoute: AppRoutes.generateRoute,
    );
  }
}
