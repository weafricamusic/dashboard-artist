# WeAfrica Music — Mobile Upload + Compression (Flutter) + Supabase

This repo already contains a server-side processing worker at [scripts/process-uploads.js](../scripts/process-uploads.js) that will:

- Download the original file from Supabase Storage
- Transcode to a streaming-friendly format
- Upload the processed output back to Storage
- Update the `uploads` row (`status`, `processed_path`, `duration_seconds`)

To support mobile uploads safely (without exposing `SUPABASE_SERVICE_ROLE_KEY`), the dashboard now provides **signed upload URLs**.

## 0) Supabase setup

- Apply migrations in [supabase/migrations](../supabase/migrations) (includes `public.uploads`).
- Create a Storage bucket (default expected name: `media`).
- Set env vars (see [.env.local.example](../.env.local.example)):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SUPABASE_STORAGE_BUCKET` (optional, default `media`)
  - `SUPABASE_AUTO_CREATE_BUCKET=true` (optional for dev)

## 1) Flutter deps

Add:

```yaml
dependencies:
  file_picker: ^5.2.5
  ffmpeg_kit_flutter: ^4.6.0
  path_provider: ^2.1.2
  http: ^1.2.0
```

Then:

```bash
flutter pub get
```

## 2) Pick a file (MP3/WAV or MP4/MOV)

```dart
import 'package:file_picker/file_picker.dart';

Future<PlatformFile?> pickMediaFile({required bool video}) async {
  final result = await FilePicker.platform.pickFiles(
    type: FileType.custom,
    allowedExtensions: video ? ['mp4', 'mov'] : ['mp3', 'wav'],
    withData: false,
  );

  return result?.files.single;
}
```

## 3) Compress on-device (lightweight)

Important notes:
- Always check FFmpeg return codes.
- Use a temp output path (don’t overwrite the original).

```dart
import 'dart:io';
import 'package:ffmpeg_kit_flutter/ffmpeg_kit.dart';
import 'package:ffmpeg_kit_flutter/return_code.dart';
import 'package:path_provider/path_provider.dart';

Future<String> _tmpOutPath(String fileName) async {
  final dir = await getTemporaryDirectory();
  return '${dir.path}/$fileName';
}

Future<String> compressAudioToMp3(String inputPath) async {
  final out = await _tmpOutPath('audio_compressed.mp3');

  // -y overwrite, 128k target bitrate.
  final session = await FFmpegKit.execute(
    '-y -i "${inputPath}" -vn -codec:a libmp3lame -b:a 128k "${out}"',
  );

  final code = await session.getReturnCode();
  if (!ReturnCode.isSuccess(code)) {
    throw Exception('Audio compression failed: ${code?.getValue()}');
  }

  return out;
}

Future<String> compressVideoMp4Light(String inputPath) async {
  final out = await _tmpOutPath('video_compressed.mp4');

  // Light compression; the server worker will do heavier normalization.
  final session = await FFmpegKit.execute(
    '-y -i "${inputPath}" '
    '-c:v libx264 -crf 28 -preset fast '
    '-c:a aac -b:a 128k '
    '-movflags +faststart "${out}"',
  );

  final code = await session.getReturnCode();
  if (!ReturnCode.isSuccess(code)) {
    throw Exception('Video compression failed: ${code?.getValue()}');
  }

  return out;
}
```

## 4) Upload to Supabase Storage using a signed upload URL (recommended)

### Backend endpoints (in this repo)

- `POST /api/uploads/init`
  - Auth: `Authorization: Bearer <FirebaseIDToken>` (or session cookie)
  - Body: `{ type: 'song'|'video', fileName: string, contentType?: string }`
  - Returns: `{ uploadId, bucket, path, token, signedUrl }`

- `POST /api/uploads/register`
  - Auth: `Authorization: Bearer <FirebaseIDToken>` (or session cookie)
  - Body: `{ type: 'song'|'video', originalPath: string, title?: string }`
  - Returns: `{ ok: true, uploadRecordId }`

### Flutter upload (HTTP PUT to signedUrl)

```dart
import 'dart:io';
import 'package:http/http.dart' as http;

Future<void> uploadToSignedUrl({
  required String signedUrl,
  required String filePath,
  required String contentType,
}) async {
  final bytes = await File(filePath).readAsBytes();

  final res = await http.put(
    Uri.parse(signedUrl),
    headers: {
      'content-type': contentType,
    },
    body: bytes,
  );

  if (res.statusCode < 200 || res.statusCode >= 300) {
    throw Exception('Upload failed: ${res.statusCode} ${res.body}');
  }
}
```

## 4b) One-call upload endpoint (simpler, best for smaller files)

If you prefer a simpler client flow (single request) you can upload to the dashboard server directly:

- `POST /api/uploads/ingest`
  - Auth: `Authorization: Bearer <FirebaseIDToken>` (or session cookie)
  - Body: `multipart/form-data` with fields:
    - `type`: `song` | `video`
    - `title`: optional
    - `file`: the binary file
  - Notes:
    - This is capped by `UPLOAD_INGEST_MAX_BYTES` (default 50MB) because bytes pass through Next.js.
    - For large videos, prefer signed uploads (`/api/uploads/init`) to upload directly to Storage.

Flutter example:

```dart
import 'dart:io';
import 'package:http/http.dart' as http;

Future<Map<String, dynamic>> ingestUpload({
  required Uri endpoint,
  required String firebaseIdToken,
  required String type, // 'song' | 'video'
  required String filePath,
  String? title,
}) async {
  final req = http.MultipartRequest('POST', endpoint);
  req.headers['authorization'] = 'Bearer $firebaseIdToken';

  req.fields['type'] = type;
  if (title != null && title.trim().isNotEmpty) {
    req.fields['title'] = title.trim();
  }

  req.files.add(await http.MultipartFile.fromPath('file', filePath));

  final streamed = await req.send();
  final body = await streamed.stream.bytesToString();
  if (streamed.statusCode < 200 || streamed.statusCode >= 300) {
    throw Exception('Ingest failed: ${streamed.statusCode} $body');
  }
  return body.isEmpty ? <String, dynamic>{} : (jsonDecode(body) as Map<String, dynamic>);
}
```

## 5) Trigger server-side processing

Once the upload is in Storage, call `/api/uploads/register` with `originalPath`.

The worker [scripts/process-uploads.js](../scripts/process-uploads.js) will pick up rows with `status='processing'`.

Run it manually:

```bash
UPLOAD_PROCESS_MAX_BATCH=3 npm run process-uploads
```

(Or run it on a cron / background worker host where `ffmpeg` + `ffprobe` are installed.)

## 5b) Poll upload status

Use:

- `GET /api/uploads/<uploadRecordId>`

This returns the row from `public.uploads` for the authenticated artist (including `status`, `processedPath`, and any `errorMessage`).

## 6) End-to-end flow

1. Artist selects MP3/WAV or MP4/MOV
2. App compresses locally
3. App calls `POST /api/uploads/init` to get a signed URL
4. App `PUT`s bytes to `signedUrl`
5. App calls `POST /api/uploads/register` (creates `uploads` record)
6. Worker transcodes and publishes processed media
