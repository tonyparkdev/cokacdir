# DIFF 기능 상세 설계 문서

## 1. 개요

### 1.1 목적
두 폴더의 내용물(파일 및 하위 폴더)을 재귀적으로 비교하여 차이점을 시각적으로 보여주는 기능.

### 1.2 핵심 특징
- 두 폴더를 재귀적으로 탐색하여 **플랫 리스트**(flat list)로 모든 항목을 펼쳐서 표시
- 좌/우 50:50 패널에 각 폴더의 내용을 나란히 배치
- **통합 커서**: 양쪽 패널의 같은 행을 동시에 하이라이트
- 한쪽에만 존재하는 항목은 반대쪽에 빈칸으로 표시
- 비교 기준(파일 크기, 바이트 내용 등)은 사용자 설정 가능
- 파일 선택 후 Enter로 **파일 내용 diff**(좌우 나란히 라인별 비교) 진입
- 필터링: 전체/다른것만/좌측만/우측만 순환 토글
- 복사/이동 등 파일 작업 지원 (방향 지정 방식은 추후 설계)

---

## 2. DIFF 진입 메커니즘

### 2.1 단축키
- 키: `8` (FilePanel 화면에서)

### 2.2 진입 흐름

#### 경우 1: 패널이 정확히 2개일 때
```
사용자가 8을 누름
  → 두 패널의 path를 left_path, right_path로 확정
  → 즉시 DiffScreen 진입
```

#### 경우 2: 패널이 3개 이상일 때 (2단계 선택)
```
[1단계] 사용자가 현재 포커스 패널에서 8을 누름
  → App.diff_first_panel = Some(active_panel_index) 저장
  → 해당 패널의 테두리 색상을 "선택됨(marked)" 색상으로 변경
  → 사용자는 Tab/좌우 키로 다른 패널로 이동

[2단계] 다른 패널에서 8을 다시 누름
  → diff_first_panel과 현재 active_panel_index로 두 패널 확정
  → left_path = panels[diff_first_panel].path
  → right_path = panels[active_panel_index].path
  → DiffScreen 진입
  → App.diff_first_panel = None (초기화)
```

#### 취소
- 1단계에서 선택 후 ESC를 누르면 `diff_first_panel = None`으로 초기화하고 선택 해제

### 2.3 App 상태 필드 추가
```rust
// src/ui/app.rs - App struct에 추가
pub diff_first_panel: Option<usize>,  // DIFF 3개 이상 패널일 때 첫 번째 선택된 패널 인덱스
pub diff_state: Option<DiffState>,    // DIFF 화면 상태
```

---

## 3. Screen enum 확장

```rust
// src/ui/app.rs
pub enum Screen {
    FilePanel,
    FileViewer,
    FileEditor,
    FileInfo,
    ProcessManager,
    Help,
    AIScreen,
    SystemInfo,
    ImageViewer,
    SearchResult,
    DiffScreen,      // 신규: 폴더 비교 화면
    DiffFileView,    // 신규: 파일 내용 비교 화면
}
```

---

## 4. 데이터 모델

### 4.1 DiffEntry - 비교 항목 단위

```rust
/// 하나의 비교 행을 나타내는 구조체
/// 재귀적으로 펼친 플랫 리스트의 각 항목
#[derive(Debug, Clone)]
pub struct DiffEntry {
    /// 상대 경로 (예: "src/main.rs", "docs/readme.md")
    pub relative_path: String,

    /// 왼쪽 폴더의 파일 정보 (없으면 None = 빈칸 표시)
    pub left: Option<DiffFileInfo>,

    /// 오른쪽 폴더의 파일 정보 (없으면 None = 빈칸 표시)
    pub right: Option<DiffFileInfo>,

    /// 비교 상태
    pub status: DiffStatus,

    /// 디렉토리 여부
    pub is_directory: bool,

    /// 디렉토리 깊이 (들여쓰기 참고용, 0 = 루트 레벨)
    pub depth: usize,
}

/// 한쪽 파일의 상세 정보
#[derive(Debug, Clone)]
pub struct DiffFileInfo {
    /// 파일/폴더 이름 (basename)
    pub name: String,

    /// 파일 크기 (바이트)
    pub size: u64,

    /// 수정 시간
    pub modified: DateTime<Local>,

    /// 디렉토리 여부
    pub is_directory: bool,

    /// 심볼릭 링크 여부
    pub is_symlink: bool,

    /// 전체 경로 (파일 작업용)
    pub full_path: PathBuf,
}

/// 비교 상태
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DiffStatus {
    /// 양쪽 동일
    Same,

    /// 양쪽 존재하지만 내용이 다름
    Modified,

    /// 왼쪽에만 존재
    LeftOnly,

    /// 오른쪽에만 존재
    RightOnly,

    /// 디렉토리: 양쪽 존재하지만 하위 내용이 다름
    DirModified,

    /// 디렉토리: 양쪽 동일 (하위 내용도 동일)
    DirSame,
}
```

### 4.2 DiffState - DIFF 화면 전체 상태

```rust
/// DIFF 화면의 전체 상태
#[derive(Debug)]
pub struct DiffState {
    /// 왼쪽 폴더 경로 (루트)
    pub left_root: PathBuf,

    /// 오른쪽 폴더 경로 (루트)
    pub right_root: PathBuf,

    /// 비교 결과 전체 리스트 (필터 적용 전)
    pub all_entries: Vec<DiffEntry>,

    /// 현재 필터가 적용된 표시용 리스트 (인덱스 참조)
    pub filtered_indices: Vec<usize>,

    /// 현재 커서 위치 (filtered_indices 기준)
    pub selected_index: usize,

    /// 스크롤 오프셋
    pub scroll_offset: usize,

    /// 현재 필터 모드
    pub filter: DiffFilter,

    /// 정렬 기준
    pub sort_by: SortBy,

    /// 정렬 순서
    pub sort_order: SortOrder,

    /// 비교 기준 설정
    pub compare_method: CompareMethod,

    /// 비교 진행 중 여부 (대용량 폴더)
    pub is_comparing: bool,

    /// 선택된 항목들 (Space로 마킹)
    pub selected_files: HashSet<String>,

    /// 화면에 보이는 높이 (렌더링 시 갱신)
    pub visible_height: usize,
}
```

### 4.3 DiffFilter - 필터 모드

```rust
/// DIFF 필터 모드
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DiffFilter {
    /// 모든 항목 표시
    All,

    /// 다른 항목만 표시 (Modified + LeftOnly + RightOnly + DirModified)
    DifferentOnly,

    /// 왼쪽에만 있는 항목만 표시
    LeftOnly,

    /// 오른쪽에만 있는 항목만 표시
    RightOnly,
}

impl DiffFilter {
    /// 다음 필터로 순환
    pub fn next(&self) -> Self {
        match self {
            DiffFilter::All => DiffFilter::DifferentOnly,
            DiffFilter::DifferentOnly => DiffFilter::LeftOnly,
            DiffFilter::LeftOnly => DiffFilter::RightOnly,
            DiffFilter::RightOnly => DiffFilter::All,
        }
    }

    /// 표시 이름
    pub fn display_name(&self) -> &str {
        match self {
            DiffFilter::All => "All",
            DiffFilter::DifferentOnly => "Different",
            DiffFilter::LeftOnly => "Left Only",
            DiffFilter::RightOnly => "Right Only",
        }
    }
}
```

### 4.4 CompareMethod - 비교 방법

```rust
/// 파일 비교 방법
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum CompareMethod {
    /// 파일 크기만 비교 (빠름)
    Size,

    /// 파일 내용 바이트 단위 비교 (정확하지만 느림)
    Content,

    /// 수정 시간 비교
    ModifiedTime,

    /// 크기 + 수정 시간 (기본값)
    SizeAndTime,
}

impl Default for CompareMethod {
    fn default() -> Self {
        CompareMethod::SizeAndTime
    }
}

impl CompareMethod {
    pub fn display_name(&self) -> &str {
        match self {
            CompareMethod::Size => "Size",
            CompareMethod::Content => "Content (byte)",
            CompareMethod::ModifiedTime => "Modified Time",
            CompareMethod::SizeAndTime => "Size + Time",
        }
    }
}
```

---

## 5. 재귀 플랫 리스트 생성 알고리즘

### 5.1 개요
두 폴더를 재귀적으로 탐색하여 모든 파일/폴더를 상대 경로 기준 플랫 리스트로 만든다.
양쪽을 이름 기준으로 매칭하고, 한쪽에만 있는 항목은 반대쪽을 None으로 처리한다.

### 5.2 알고리즘 의사코드

```
함수 build_diff_list(left_root, right_root, compare_method) -> Vec<DiffEntry>:
    결과 = 빈 리스트

    함수 재귀_비교(상대경로, 깊이):
        left_dir = left_root / 상대경로
        right_dir = right_root / 상대경로

        left_items = left_dir의 직접 자식 목록 (이름 → FileInfo 맵)
        right_items = right_dir의 직접 자식 목록 (이름 → FileInfo 맵)

        // 양쪽 이름을 합집합으로 수집하고 정렬 (현재 sort_by 기준)
        all_names = left_items.keys ∪ right_items.keys
        all_names를 정렬

        각 name에 대해:
            left_info = left_items.get(name)   // Option
            right_info = right_items.get(name)  // Option

            if 양쪽 다 디렉토리:
                // 하위 재귀 비교
                하위_결과 = 재귀_비교(상대경로/name, 깊이+1)
                하위에_차이가_있는지 = 하위_결과 중 Same/DirSame이 아닌 것이 있는지

                entry = DiffEntry {
                    relative_path: 상대경로/name,
                    left: Some(left_info),
                    right: Some(right_info),
                    status: if 하위에_차이가_있는지 { DirModified } else { DirSame },
                    is_directory: true,
                    depth: 깊이,
                }
                결과.push(entry)
                결과.extend(하위_결과)  // 하위 항목들을 바로 뒤에 추가

            elif 한쪽만 디렉토리:
                // 타입이 다름 → Modified 취급
                entry = DiffEntry {
                    relative_path: 상대경로/name,
                    left: left_info,
                    right: right_info,
                    status: DiffStatus::Modified,
                    is_directory: false,
                    depth: 깊이,
                }
                결과.push(entry)

            elif 양쪽 다 파일:
                status = compare_method에 따라 비교
                entry = DiffEntry {
                    relative_path: 상대경로/name,
                    left: Some(left_info),
                    right: Some(right_info),
                    status: if 같으면 Same else Modified,
                    is_directory: false,
                    depth: 깊이,
                }
                결과.push(entry)

            elif 왼쪽에만 존재:
                if left_info.is_directory:
                    // 왼쪽에만 있는 디렉토리와 그 하위 전부 LeftOnly
                    entry = DiffEntry { ..., status: LeftOnly, is_directory: true }
                    결과.push(entry)
                    왼쪽_하위_전부_재귀_추가(상대경로/name, 깊이+1, LeftOnly)
                else:
                    entry = DiffEntry { ..., status: LeftOnly, is_directory: false }
                    결과.push(entry)

            elif 오른쪽에만 존재:
                // LeftOnly와 대칭
                ...

    재귀_비교("", 0)
    return 결과
```

### 5.3 비교 방법별 로직

```rust
fn compare_files(left: &DiffFileInfo, right: &DiffFileInfo, method: CompareMethod) -> bool {
    match method {
        CompareMethod::Size => {
            left.size == right.size
        }
        CompareMethod::Content => {
            // 크기가 다르면 바로 false
            if left.size != right.size {
                return false;
            }
            // 바이트 단위 비교 (버퍼 사용)
            byte_compare(&left.full_path, &right.full_path)
        }
        CompareMethod::ModifiedTime => {
            left.modified == right.modified
        }
        CompareMethod::SizeAndTime => {
            left.size == right.size && left.modified == right.modified
        }
    }
}

fn byte_compare(path_a: &Path, path_b: &Path) -> bool {
    // 8KB 버퍼로 청크 단위 비교
    const BUFFER_SIZE: usize = 8192;
    let mut file_a = File::open(path_a)?;
    let mut file_b = File::open(path_b)?;
    let mut buf_a = [0u8; BUFFER_SIZE];
    let mut buf_b = [0u8; BUFFER_SIZE];
    loop {
        let n_a = file_a.read(&mut buf_a)?;
        let n_b = file_b.read(&mut buf_b)?;
        if n_a != n_b || buf_a[..n_a] != buf_b[..n_b] {
            return false;
        }
        if n_a == 0 {
            return true;  // 둘 다 EOF
        }
    }
}
```

### 5.4 정렬 규칙
기존 패널과 동일한 정렬 규칙 적용:
- 디렉토리가 항상 파일보다 먼저 (같은 depth 내에서)
- SortBy (Name, Type, Size, Modified)와 SortOrder (Asc, Desc) 적용
- 같은 부모 아래의 항목들끼리만 정렬 (depth별 그룹 정렬)

---

## 6. DIFF 화면 레이아웃

### 6.1 전체 구조

```
┌─────────────────────────────────────────────────────────────────┐
│ [DIFF] /home/user/project_v1  ⟷  /home/user/project_v2        │  ← 헤더 (1줄)
├──────────────────────────────┬──────────────────────────────────┤
│ Name       Size    Date      │ Name       Size    Date          │  ← 컬럼 헤더 (1줄)
├──────────────────────────────┼──────────────────────────────────┤
│ ▶ src/            Jan 01     │ ▶ src/            Jan 01         │  ← DirModified (노란색)
│   src/main.rs  2KB Jan 01    │   src/main.rs  3KB Jan 02        │  ← Modified (노란색)
│   src/lib.rs   1KB Jan 01    │   src/lib.rs   1KB Jan 01        │  ← Same (기본색)
│   src/old.rs   5KB Jan 01    │                                  │  ← LeftOnly (초록색/빈칸)
│                              │   src/new.rs   2KB Jan 03        │  ← RightOnly (파란색/빈칸)
│██ readme.md    1KB Jan 01 ███│██ readme.md    2KB Jan 02 ███████│  ← 커서 bar (양쪽 관통)
│   .gitignore   100 Jan 01    │   .gitignore   100 Jan 01        │  ← Same
│ ...                          │ ...                              │
├──────────────────────────────┴──────────────────────────────────┤
│ Filter: All  |  Total: 150  Different: 23  Left: 5  Right: 8   │  ← 상태 바 (1줄)
├─────────────────────────────────────────────────────────────────┤
│ ↑↓nav  Enter:view  F:filter  Spc:sel  ^c:cpy  ^v:pst  Esc:back│  ← 기능 바 (1줄)
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 레이아웃 분할 (ratatui Layout)

```rust
// 세로 분할
let vertical = Layout::default()
    .direction(Direction::Vertical)
    .constraints([
        Constraint::Length(1),   // 헤더 (DIFF 제목 + 양쪽 경로)
        Constraint::Length(1),   // 컬럼 헤더 (Name, Size, Date)
        Constraint::Min(5),      // 비교 내용 영역
        Constraint::Length(1),   // 상태 바
        Constraint::Length(1),   // 기능 바
    ])
    .split(area);

// 비교 내용 영역을 좌우 분할
let horizontal = Layout::default()
    .direction(Direction::Horizontal)
    .constraints([
        Constraint::Percentage(50),  // 왼쪽 패널
        Constraint::Percentage(50),  // 오른쪽 패널
    ])
    .split(vertical[2]);
```

### 6.3 헤더 행
```
[DIFF] /home/user/folder_a  ⟷  /home/user/folder_b
```
- `[DIFF]` 라벨은 강조색
- 양쪽 경로는 긴 경우 끝부분만 표시 (`...project/src`)
- `⟷` 구분자

### 6.4 컬럼 헤더 행
기존 panel.rs의 컬럼 헤더와 동일한 구조:
- Name, Type(공간 여유 시), Size, Date
- 양쪽 패널에 각각 동일한 컬럼 헤더 표시

### 6.5 비교 내용 영역 - 각 행 렌더링

각 `DiffEntry`에 대해 한 행을 렌더링:

```
왼쪽 패널:
  [들여쓰기(depth*2)][아이콘][이름]  [크기]  [날짜]

오른쪽 패널:
  [들여쓰기(depth*2)][아이콘][이름]  [크기]  [날짜]
```

- 한쪽이 None이면 해당 패널은 빈 행으로 렌더링
- 들여쓰기: `depth * 2` 칸의 공백으로 계층 구조 시각화
- 아이콘: 기존 패널과 동일 (▶ 폴더, 파일 아이콘 등)

### 6.6 커서 bar
- `selected_index`에 해당하는 행의 **양쪽 패널 전체**에 커서 배경색 적용
- 기존 패널의 `selected_bg`/`selected_text`를 사용하되, DIFF 전용 색상도 가능

### 6.7 상태 바
```
Filter: All  |  Total: 150  Different: 23  Left: 5  Right: 8
```
- 현재 필터 모드 표시
- 전체 항목 수, 차이 있는 항목 수, 왼쪽만/오른쪽만 항목 수

### 6.8 기능 바
```
↑↓nav  Enter:diff  f:filter  Spc:sel  nsdy:sort  Esc:back
```
- DIFF 화면 전용 단축키 안내

---

## 7. 파일 내용 DIFF 화면 (DiffFileView)

### 7.1 진입 조건
- DiffScreen에서 커서가 **파일**(디렉토리가 아닌)에 위치한 상태에서 Enter
- 양쪽 모두 존재하는 파일일 때: 좌우 나란히 라인 비교
- 한쪽만 존재하는 파일일 때: 존재하는 쪽만 표시 (반대쪽은 빈 화면)

### 7.2 레이아웃

```
┌─────────────────────────────────────────────────────────────────┐
│ [FILE DIFF] src/main.rs                                         │  ← 헤더
├──────────────────────────────┬──────────────────────────────────┤
│  1 │ fn main() {             │  1 │ fn main() {                 │  ← 동일 라인 (기본색)
│  2 │   let x = 10;           │  2 │   let x = 20;              │  ← 변경 라인 (노란 배경)
│  3 │   println!("hello");    │    │                             │  ← 삭제 라인 (빨간 배경/빈칸)
│    │                         │  3 │   let y = 30;              │  ← 추가 라인 (초록 배경/빈칸)
│  4 │ }                       │  4 │ }                           │  ← 동일 라인
├──────────────────────────────┴──────────────────────────────────┤
│ Lines: 4/4  Changes: 3  ↑↓:nav  Esc:back                       │  ← 상태 바
└─────────────────────────────────────────────────────────────────┘
```

### 7.3 DiffFileViewState

```rust
/// 파일 내용 비교 화면 상태
#[derive(Debug)]
pub struct DiffFileViewState {
    /// 왼쪽 파일 경로
    pub left_path: PathBuf,

    /// 오른쪽 파일 경로
    pub right_path: PathBuf,

    /// 비교 결과 라인 리스트
    pub diff_lines: Vec<DiffLine>,

    /// 현재 스크롤 위치
    pub scroll: usize,

    /// 화면에 보이는 높이
    pub visible_height: usize,

    /// 왼쪽 총 라인 수
    pub left_total_lines: usize,

    /// 오른쪽 총 라인 수
    pub right_total_lines: usize,

    /// 변경된 라인 위치 목록 (빠른 점프용)
    pub change_positions: Vec<usize>,

    /// 현재 변경 위치 인덱스
    pub current_change: usize,
}

/// 하나의 diff 라인
#[derive(Debug, Clone)]
pub struct DiffLine {
    /// 왼쪽 라인 번호 (없으면 None = 빈 행)
    pub left_line_no: Option<usize>,

    /// 왼쪽 라인 내용
    pub left_content: Option<String>,

    /// 오른쪽 라인 번호
    pub right_line_no: Option<usize>,

    /// 오른쪽 라인 내용
    pub right_content: Option<String>,

    /// 라인 상태
    pub line_status: DiffLineStatus,
}

/// 라인별 비교 상태
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DiffLineStatus {
    /// 양쪽 동일
    Same,

    /// 양쪽 존재하지만 내용이 다름
    Modified,

    /// 왼쪽에만 존재 (삭제됨)
    LeftOnly,

    /// 오른쪽에만 존재 (추가됨)
    RightOnly,
}
```

### 7.4 라인 비교 알고리즘 (LCS 기반)
- Longest Common Subsequence (LCS) 알고리즘으로 양쪽 라인 매칭
- 매칭되지 않는 라인은 추가(RightOnly) 또는 삭제(LeftOnly)로 분류
- 매칭되었지만 내용이 다른 라인은 Modified로 분류

```
의사코드:
  left_lines = 왼쪽 파일의 라인 배열
  right_lines = 오른쪽 파일의 라인 배열

  lcs = LCS(left_lines, right_lines)

  양쪽을 순서대로 순회하며:
    - LCS에 포함된 라인쌍: Same 또는 Modified (내용이 미세하게 다르면)
    - 왼쪽에만 남은 라인: LeftOnly
    - 오른쪽에만 남은 라인: RightOnly
```

### 7.5 파일 내용 DIFF 키 입력
| 키 | 동작 |
|---|---|
| ↑/↓ | 한 줄씩 스크롤 |
| PageUp/PageDown | 페이지 단위 스크롤 |
| Home/End | 처음/끝으로 이동 |
| n/N | 다음/이전 변경 위치로 점프 |
| ESC | DiffScreen으로 복귀 |

---

## 8. 테마 색상 시스템 확장

### 8.1 DiffColors 구조체 신설

```rust
// src/ui/theme.rs에 추가

/// DIFF 화면 색상
#[derive(Clone, Copy)]
pub struct DiffColors {
    // === 프레임 ===
    /// DIFF 화면 배경색
    pub bg: Color,
    /// DIFF 패널 테두리
    pub border: Color,
    /// DIFF 헤더 텍스트 (경로 표시)
    pub header_text: Color,
    /// DIFF 헤더 라벨 ("[DIFF]" 텍스트)
    pub header_label: Color,
    /// 컬럼 헤더 배경
    pub column_header_bg: Color,
    /// 컬럼 헤더 텍스트
    pub column_header_text: Color,

    // === 항목 상태별 색상 ===
    /// 동일 파일 텍스트
    pub same_text: Color,
    /// 변경된 파일 텍스트 (양쪽 존재하나 내용 다름)
    pub modified_text: Color,
    /// 변경된 파일 배경
    pub modified_bg: Color,
    /// 왼쪽에만 존재하는 파일 텍스트
    pub left_only_text: Color,
    /// 왼쪽에만 존재하는 파일 배경
    pub left_only_bg: Color,
    /// 오른쪽에만 존재하는 파일 텍스트
    pub right_only_text: Color,
    /// 오른쪽에만 존재하는 파일 배경
    pub right_only_bg: Color,
    /// 빈칸 (반대쪽에 없는 항목의 자리) 배경
    pub empty_bg: Color,

    // === 디렉토리 ===
    /// 디렉토리 텍스트 (동일)
    pub dir_same_text: Color,
    /// 디렉토리 텍스트 (하위 내용 다름)
    pub dir_modified_text: Color,

    // === 커서 ===
    /// 커서 bar 배경
    pub cursor_bg: Color,
    /// 커서 bar 텍스트
    pub cursor_text: Color,

    // === 선택 (마킹) ===
    /// Space로 마킹된 항목 텍스트
    pub marked_text: Color,

    // === 크기/날짜 컬럼 ===
    /// 파일 크기 텍스트
    pub size_text: Color,
    /// 수정 날짜 텍스트
    pub date_text: Color,

    // === 상태 바 ===
    /// 상태 바 배경
    pub status_bar_bg: Color,
    /// 상태 바 텍스트
    pub status_bar_text: Color,
    /// 필터 라벨 텍스트
    pub filter_label: Color,
    /// 통계 수치 텍스트
    pub stats_text: Color,

    // === 기능 바 ===
    /// 기능 바 단축키 텍스트
    pub footer_key: Color,
    /// 기능 바 설명 텍스트
    pub footer_text: Color,

    // === DIFF 패널 선택 표시 (3개 이상 패널에서 첫 번째 선택 시) ===
    /// 선택된 패널의 테두리 색상
    pub panel_selected_border: Color,
}
```

### 8.2 DiffFileViewColors 구조체 신설

```rust
/// 파일 내용 DIFF 화면 색상
#[derive(Clone, Copy)]
pub struct DiffFileViewColors {
    // === 프레임 ===
    /// 배경색
    pub bg: Color,
    /// 테두리
    pub border: Color,
    /// 헤더 텍스트
    pub header_text: Color,

    // === 라인 번호 ===
    /// 라인 번호 텍스트
    pub line_number: Color,

    // === 라인 상태별 색상 ===
    /// 동일 라인 텍스트
    pub same_text: Color,
    /// 변경된 라인 텍스트
    pub modified_text: Color,
    /// 변경된 라인 배경
    pub modified_bg: Color,
    /// 왼쪽에만 있는 라인 (삭제) 텍스트
    pub left_only_text: Color,
    /// 왼쪽에만 있는 라인 (삭제) 배경
    pub left_only_bg: Color,
    /// 오른쪽에만 있는 라인 (추가) 텍스트
    pub right_only_text: Color,
    /// 오른쪽에만 있는 라인 (추가) 배경
    pub right_only_bg: Color,
    /// 빈 라인 (반대쪽에 대응 없음) 배경
    pub empty_bg: Color,

    // === 인라인 변경 하이라이트 (Modified 라인 내 구체적 차이) ===
    /// 변경된 문자/단어 배경
    pub inline_change_bg: Color,
    /// 변경된 문자/단어 텍스트
    pub inline_change_text: Color,

    // === 상태 바 ===
    /// 상태 바 배경
    pub status_bar_bg: Color,
    /// 상태 바 텍스트
    pub status_bar_text: Color,

    // === 기능 바 ===
    /// 기능 바 단축키
    pub footer_key: Color,
    /// 기능 바 설명
    pub footer_text: Color,
}
```

### 8.3 Theme 구조체에 추가

```rust
// src/ui/theme.rs - Theme struct
pub struct Theme {
    // ... 기존 필드들 ...
    pub diff: DiffColors,               // 신규
    pub diff_file_view: DiffFileViewColors,  // 신규
}
```

### 8.4 to_json()에 추가
기존 패턴을 따라 `to_json()` 함수 내에 diff 섹션 추가:

```json
{
    "__diff__": "=== Diff Screen: folder comparison view ===",
    "diff": {
        "__bg__": "DIFF 화면 배경색",
        "bg": 235,
        "__border__": "DIFF 패널 테두리 색상",
        "border": 244,
        "__header_text__": "DIFF 헤더 경로 텍스트",
        "header_text": 255,
        ...
    },
    "__diff_file_view__": "=== Diff File View: line-by-line file comparison ===",
    "diff_file_view": {
        ...
    }
}
```

### 8.5 기본 색상값 (dark 테마 기준)

| 필드 | 용도 | Color::Indexed 값 |
|------|------|-------------------|
| same_text | 동일 파일 | 252 (밝은 회색) |
| modified_text | 변경된 파일 | 220 (노란색) |
| modified_bg | 변경된 파일 배경 | 58 (어두운 노랑) |
| left_only_text | 왼쪽만 존재 | 114 (초록색) |
| left_only_bg | 왼쪽만 존재 배경 | 22 (어두운 초록) |
| right_only_text | 오른쪽만 존재 | 111 (파란색) |
| right_only_bg | 오른쪽만 존재 배경 | 24 (어두운 파랑) |
| empty_bg | 빈 자리 배경 | 236 (약간 밝은 검정) |
| dir_modified_text | 내용 다른 디렉토리 | 220 (노란색) |
| cursor_bg | 커서 bar 배경 | 240 (중간 회색) |

---

## 9. 설정 확장

### 9.1 Settings 구조체에 추가

```rust
// src/config.rs - Settings struct
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    // ... 기존 필드들 ...

    /// DIFF 비교 방법 설정
    #[serde(default)]
    pub diff_compare_method: String,  // "size", "content", "modified_time", "size_and_time"
}
```

### 9.2 기본값
```rust
impl Default for Settings {
    fn default() -> Self {
        Self {
            // ... 기존 ...
            diff_compare_method: "size_and_time".to_string(),
        }
    }
}
```

### 9.3 설정 다이얼로그 확장
기존 Settings 다이얼로그(`` ` `` 키)에 항목 추가:

```
┌──────── Settings ────────┐
│                          │
│ > Theme:  < dark >       │
│   Diff:   < Size+Time >  │
│                          │
│ ←→ Change  ↑↓ Move       │
│ Enter Save  Esc Cancel   │
└──────────────────────────┘
```

- ↑↓ 키로 설정 항목 간 이동
- ←→/Space로 값 변경
- 기존 SettingsState에 필드 추가:

```rust
pub struct SettingsState {
    pub themes: Vec<String>,
    pub theme_index: usize,
    pub selected_field: usize,          // 신규: 현재 선택된 설정 행 (0=Theme, 1=Diff)
    pub diff_methods: Vec<String>,      // 신규: ["Size", "Content", "Modified Time", "Size+Time"]
    pub diff_method_index: usize,       // 신규: 현재 선택된 비교 방법
}
```

---

## 10. 키 입력 처리

### 10.1 DiffScreen 키 맵핑

| 키 | 동작 | 설명 |
|---|---|---|
| ↑ / ↓ | 커서 이동 | 한 행씩 위/아래 |
| PageUp / PageDown | 페이지 이동 | 10행 단위 |
| Home / End | 처음/끝 | 리스트 처음/끝으로 |
| Enter | 파일 내용 diff 진입 | 파일인 경우 DiffFileView 화면으로 |
| Space | 항목 선택/해제 | 마킹 토글 |
| f | 필터 순환 | All → Different → LeftOnly → RightOnly → All |
| n / N | 정렬: 이름순 | 토글 (Asc/Desc) |
| s / S | 정렬: 크기순 | 토글 (Asc/Desc) |
| d / D | 정렬: 날짜순 | 토글 (Asc/Desc) |
| y / Y | 정렬: 타입순 | 토글 (Asc/Desc) |
| Ctrl+C | 복사 | (추후 구현) |
| Ctrl+X | 잘라내기 | (추후 구현) |
| Ctrl+V | 붙여넣기 | (추후 구현) |
| ESC | 나가기 | FilePanel 화면으로 복귀 |

### 10.2 main.rs 이벤트 루프 확장

```rust
// main.rs - run_app() 내 match app.current_screen
Screen::DiffScreen => {
    ui::diff_screen::handle_input(app, key.code, key.modifiers);
}
Screen::DiffFileView => {
    ui::diff_file_view::handle_input(app, key.code, key.modifiers);
}
```

### 10.3 FilePanel에서 8키 처리

```rust
// main.rs - handle_panel_input() 내 match code
KeyCode::Char('8') => app.start_diff(),
```

### 10.4 App::start_diff() 로직

```rust
impl App {
    pub fn start_diff(&mut self) {
        let panel_count = self.panels.len();

        if panel_count < 2 {
            self.show_message("Need at least 2 panels for diff");
            return;
        }

        if panel_count == 2 {
            // 즉시 진입
            let left = self.panels[0].path.clone();
            let right = self.panels[1].path.clone();
            self.enter_diff_screen(left, right);
            return;
        }

        // 3개 이상: 2단계 선택
        if let Some(first) = self.diff_first_panel {
            if first != self.active_panel_index {
                // 2단계: 두 번째 선택 완료
                let left = self.panels[first].path.clone();
                let right = self.panels[self.active_panel_index].path.clone();
                self.diff_first_panel = None;
                self.enter_diff_screen(left, right);
            }
            // 같은 패널을 다시 누르면 무시
        } else {
            // 1단계: 첫 번째 선택
            self.diff_first_panel = Some(self.active_panel_index);
            self.show_message("First panel selected. Press 8 on another panel.");
        }
    }

    fn enter_diff_screen(&mut self, left: PathBuf, right: PathBuf) {
        let compare_method = parse_compare_method(&self.settings.diff_compare_method);
        let sort_by = self.active_panel().sort_by;
        let sort_order = self.active_panel().sort_order;

        let mut state = DiffState::new(left, right, compare_method, sort_by, sort_order);
        state.build_diff_list();

        self.diff_state = Some(state);
        self.current_screen = Screen::DiffScreen;
    }
}
```

---

## 11. 파일 구조 변경 사항

### 11.1 신규 파일

| 파일 | 용도 | 예상 크기 |
|------|------|-----------|
| `src/ui/diff_screen.rs` | DIFF 화면 상태, 렌더링, 입력 처리 | ~1500줄 |
| `src/ui/diff_file_view.rs` | 파일 내용 비교 화면 상태, 렌더링, 입력 처리 | ~800줄 |

### 11.2 수정 파일

| 파일 | 변경 내용 |
|------|-----------|
| `src/ui/mod.rs` | `pub mod diff_screen;` 및 `pub mod diff_file_view;` 추가 |
| `src/ui/app.rs` | Screen enum에 DiffScreen/DiffFileView 추가, App struct에 diff 관련 필드 추가, start_diff() 등 메서드 추가 |
| `src/ui/draw.rs` | DiffScreen/DiffFileView 렌더링 디스패치 추가 |
| `src/ui/theme.rs` | DiffColors, DiffFileViewColors 구조체 추가, Theme에 필드 추가, to_json() 확장, Default 구현 |
| `src/ui/theme_loader.rs` | JSON에서 diff 색상 로드 로직 추가 |
| `src/ui/panel.rs` | diff_first_panel 선택 시 테두리 색상 변경 로직 |
| `src/config.rs` | Settings에 diff_compare_method 추가 |
| `src/ui/dialogs.rs` | 설정 다이얼로그에 Diff 비교 방법 항목 추가 |
| `src/main.rs` | run_app()에 DiffScreen/DiffFileView 이벤트 핸들링 추가, handle_panel_input()에 키 8 추가 |

---

## 12. 엣지 케이스 및 예외 처리

### 12.1 빈 폴더
- 한쪽 또는 양쪽 폴더가 비어있는 경우 정상 처리
- 양쪽 다 비어있으면 "No items to compare" 메시지 표시

### 12.2 권한 없는 폴더/파일
- 읽기 권한이 없는 디렉토리는 스킵하고 경고 메시지
- 읽기 권한이 없는 파일은 비교 불가로 Modified 취급

### 12.3 심볼릭 링크
- 심볼릭 링크는 링크 자체가 아닌 대상(target)을 따라가서 비교
- 깨진 심볼릭 링크는 별도 표시

### 12.4 매우 큰 디렉토리
- 파일 수가 매우 많을 경우 비교 시간이 걸릴 수 있음
- `is_comparing` 플래그로 진행 상태 표시 고려
- Content 비교 시 대용량 파일은 시간이 오래 걸릴 수 있으므로 진행률 표시 고려

### 12.5 같은 폴더를 비교
- 양쪽 경로가 동일한 경우 진입은 허용하되 모든 항목이 Same으로 표시

### 12.6 바이너리 파일의 내용 diff
- Enter로 파일 내용 diff 진입 시 바이너리 파일이면 "Binary files differ" 메시지 표시
- 텍스트 파일만 라인별 비교 수행

### 12.7 매우 긴 경로
- 상대 경로가 패널 너비를 초과하면 끝부분만 표시 (`...path/to/file.txt`)

---

## 13. 구현 순서 (권장)

### Phase 1: 기본 구조
1. Screen enum 확장 (DiffScreen, DiffFileView)
2. DiffState, DiffEntry 등 데이터 모델 구현
3. App struct에 diff 관련 필드 추가
4. DiffColors, DiffFileViewColors 테마 구조체 추가
5. Theme에 기본값 설정 및 to_json() 확장

### Phase 2: DIFF 진입
6. 단축키 8 핸들링 (2개 패널 즉시 진입)
7. 3개 이상 패널 2단계 선택 로직
8. 선택된 패널 테두리 색상 변경

### Phase 3: 폴더 비교 핵심
9. 재귀 플랫 리스트 생성 알고리즘
10. 비교 방법별 파일 비교 로직
11. 필터링 로직

### Phase 4: DIFF 화면 렌더링
12. diff_screen.rs - draw() 함수 (레이아웃, 양쪽 패널, 커서 bar)
13. 상태 바, 기능 바 렌더링
14. 스크롤 처리

### Phase 5: DIFF 화면 입력
15. 커서 이동 (↑↓, PageUp/Down, Home/End)
16. 필터 토글 (f키)
17. 정렬 변경 (n/s/d/y)
18. ESC로 나가기

### Phase 6: 파일 내용 DIFF
19. LCS 기반 라인 비교 알고리즘
20. diff_file_view.rs - draw() 함수
21. 변경 위치 점프 (n/N)

### Phase 7: 설정 연동
22. Settings에 diff_compare_method 추가
23. 설정 다이얼로그 확장
24. theme_loader.rs에 diff 색상 로드 추가

### Phase 8: 마무리
25. 엣지 케이스 처리
26. 기능 바(하단) 표시에 diff 단축키 안내 추가
27. help 화면에 diff 관련 도움말 추가
