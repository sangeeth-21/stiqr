import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';

void main() {
  runApp(const StiqrIOSApp());
}

class StiqrIOSApp extends StatelessWidget {
  const StiqrIOSApp({super.key});

  @override
  Widget build(BuildContext context) {
    return const CupertinoApp(
      title: 'Stiqr iOS',
      debugShowCheckedModeBanner: false,
      theme: CupertinoThemeData(
        brightness: Brightness.dark,
        primaryColor: CupertinoColors.activeBlue,
      ),
      home: IOSHomeScreen(),
    );
  }
}

class IOSHomeScreen extends StatelessWidget {
  const IOSHomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return CupertinoPageScaffold(
      navigationBar: const CupertinoNavigationBar(
        middle: Text('Stiqr iOS'),
      ),
      child: Center(
        child: Container(
          padding: const EdgeInsets.all(24.0),
          margin: const EdgeInsets.symmetric(horizontal: 24.0),
          decoration: BoxDecoration(
            color: CupertinoColors.systemGrey6.darkColor,
            borderRadius: BorderRadius.circular(16),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: const [
              Icon(CupertinoIcons.phone, size: 64, color: CupertinoColors.activeBlue),
              SizedBox(height: 16),
              Text(
                'Hello World!',
                style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: CupertinoColors.white),
              ),
              SizedBox(height: 8),
              Text(
                'Welcome to Stiqr iOS App (Flutter / SwiftUI)',
                textAlign: TextAlign.center,
                style: TextStyle(color: CupertinoColors.systemGrey),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
