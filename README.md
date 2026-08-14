# 🏫 스마트 QR 방문 접수처 (Smart QR School Reception)

> **교사를 위한 스마트 교무실 출입 관리 및 방문 메모 시스템**  
> 학생이 교무실 문 앞 QR 코드를 스마트폰으로 스캔하여 선생님을 호출하면, 선생님 PC 화면에 알림음과 함께 대형 수락 팝업이 뜹니다. 선생님이 [무시]를 누르거나 마우스 10초 미동작 시 [자동 부재중] 처리되어 학생에게 개인정보 수집 동의 후 방문 메모를 남기게 합니다.

---

## 🎨 학교 환경을 위한 추천 디자인 테마 2종

1. **에듀 슬레이트 & 에메랄드 (Edu Slate & Focus Emerald - 기본 적용)**
   - 집중력을 높여주는 슬레이트 다크 캔버스 위에 눈의 피로를 덜어주는 에메랄드 그린 액센트 컬러를 매치했습니다.
   - 멀리서도 선생님이 즉시 식별할 수 있도록 거대한 타이포그래피와 고대비 버튼(수락: 에메랄드 그린 / 무시: 로즈 레드)을 배치했습니다.
2. **따뜻한 교실 & 인디고 (Warm Classroom & Indigo)**
   - 따뜻한 스톤/웜 그레이 바탕과 신뢰감 있는 인디고 블루가 어우러진 차분하고 클래식한 교육 기관 테마입니다.

---

## 📦 데이터베이스 설계 (Firebase Cloud Firestore)

- **`teachers` 컬렉션**
  - `name` (string): 선생님 성함
  - `room` (string): 소속 교무실 (예: '본관 1교무실', '2학년 연구실')
  - `subject` (string): 담당 과목 또는 직책
  - `createdAt` (number): 등록 일시
- **`calls` 컬렉션**
  - `room` (string): 교무실 명칭
  - `teacherName` (string): 호출된 선생님 성함
  - `status` (string): `'pending'` | `'accepted'` | `'ignored'` | `'auto-away'`
  - `studentName` (string): 학생 학번 및 이름 (초기 빈값, 메모 작성 시 업데이트)
  - `reason` (string): 방문 목적 (초기 빈값, 메모 작성 시 업데이트)
  - `hasMemo` (boolean): 방문 메모 작성 여부 (초기 `false`)
  - `createdAt` (number): 호출 일시

---

## 🚀 1단계부터 시작하는 Firebase 설정 가이드 (선생님용)

코딩이 처음이신 선생님도 아래 순서대로 따라 하시면 5분 안에 클라우드 데이터베이스를 연동할 수 있습니다.

### 1. Firebase 프로젝트 만들기
1. [Firebase 콘솔(firebase.google.com)](https://console.firebase.google.com/)에 접속하여 구글 계정으로 로그인합니다.
2. **[프로젝트 만들기]** 버튼을 누르고 프로젝트 이름(예: `school-qr-app`)을 입력합니다.
3. 구글 애널리틱스는 필요에 따라 선택하고 생성을 완료합니다.

### 2. Cloud Firestore 데이터베이스 생성
1. 생성된 프로젝트 좌측 메뉴에서 **[빌드] → [Firestore Database]**를 클릭합니다.
2. **[데이터베이스 만들기]**를 클릭하고 데이터베이스 위치를 `asia-northeast3 (서울)`로 선택합니다.
3. 보안 규칙 시작 단계에서 **테스트 모드** 또는 **프로덕션 모드** 중 아무거나 선택하고 완료합니다.

### 3. Firestore 보안 규칙(Rules) 적용
상단의 **[규칙 (Rules)]** 탭을 클릭하고 아래 규칙을 복사하여 붙여넣은 후 **[게시 (Publish)]**를 누릅니다:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 교무실 스마트 방문 접수 보안 규칙
    // 학생의 비로그인 호출 및 메모 생성을 허용하고, 무단 삭제는 차단합니다.
    match /{document=**} {
      allow read, create, update: if true;
      allow delete: if false;
    }
  }
}
```

### 4. 웹 앱 등록 및 환경변수 복사
1. 프로젝트 개요 화면 좌측 상단 ⚙️ **[프로젝트 설정]**으로 이동합니다.
2. **[내 앱]** 섹션에서 웹 아이콘(`</>`)을 클릭하고 앱 닉네임을 입력한 뒤 앱을 등록합니다.
3. `firebaseConfig` 객체 안에 있는 6개 값을 확인합니다.
4. 프로젝트 루트 디렉터리에 `.env.local` 파일을 생성하고 아래와 같이 입력합니다:

```env
VITE_FIREBASE_API_KEY="AIzaSyYourApiKeyHere..."
VITE_FIREBASE_AUTH_DOMAIN="your-project-id.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="your-project-id"
VITE_FIREBASE_STORAGE_BUCKET="your-project-id.appspot.com"
VITE_FIREBASE_MESSAGING_SENDER_ID="123456789012"
VITE_FIREBASE_APP_ID="1:123456789012:web:abcdef123456"
```

---

## 🌐 GitHub 커밋 및 Vercel 자동 배포 가이드

### GitHub 저장소 생성 & 푸시
```bash
git init
git add .
git commit -m "feat: 스마트 QR 방문 접수처 최초 커밋"
git branch -M main
git remote add origin https://github.com/당신의계정/smart-school-qr.git
git push -u origin main
```

### Vercel 원클릭 배포
1. [Vercel](https://vercel.com)에 로그인 후 **[Add New...] → [Project]**를 선택합니다.
2. 방금 올린 GitHub 레포지토리를 **[Import]**합니다.
3. **Environment Variables** 설정 섹션을 펼치고, `.env.local`에 작성했던 6개 환경변수를 동일하게 추가합니다.
4. **[Deploy]** 버튼을 누르면 약 1분 후 전 세계 어디서나 접속 가능한 고유 URL이 발급됩니다.
5. 이후 GitHub에 코드를 `git push`할 때마다 Vercel이 자동으로 감지하여 최신 버전으로 재배포됩니다.
