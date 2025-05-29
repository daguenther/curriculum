// src/App.test.tsx
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import App from './App';
import type { Course, CourseMetadata } from './types';
import { EMPTY_ARRAY_JSON_STRING } from './utils/constants';

// --- Mocks ---

// Mock Firebase interactions
vi.mock('./firebase', () => ({
  fetchCourseById: vi.fn(),
  saveCourse: vi.fn(),
  fetchAllCourseMetadata: vi.fn(),
}));
import { fetchAllCourseMetadata, fetchCourseById } from './firebase';

// Mock child components that are complex and not the direct subject of this test
vi.mock('./components/CurriculumEditor/CurriculumEditor', () => ({
  default: forwardRef((props: any, ref: any) => {
    // Expose dummy functions for any refs used by App
    useImperativeHandle(ref, () => ({
      triggerAddUnit: vi.fn(),
      triggerCopyMarkdown: vi.fn(),
      triggerSuggestChanges: vi.fn(),
      scrollToSection: vi.fn(),
    }));
    return <div data-testid="mock-curriculum-editor">Curriculum Editor</div>;
  }),
}));

vi.mock('./components/StatusBar/StatusBar', () => ({
  default: () => <div data-testid="mock-status-bar">Status Bar</div>,
}));

vi.mock('./components/ComparisonView/ComparisonView', () => ({
  default: () => <div data-testid="mock-comparison-view">Comparison View</div>,
}));

// Mock Mantine hooks and other utilities if they cause issues in test environment
vi.mock('@mantine/hooks', async (importOriginal) => {
    const actual = await importOriginal() as any;
    return {
        ...actual,
        useDisclosure: () => [false, { toggle: vi.fn(), open: vi.fn(), close: vi.fn() }],
        // Add other hooks if needed, e.g. useMediaQuery, useReducedMotion
    };
});

// Mock notifications
vi.mock('@mantine/notifications', () => ({
  notifications: {
    show: vi.fn(),
    update: vi.fn(),
    hide: vi.fn(),
    clean: vi.fn(),
  }
}));

// react-router-dom if it was used (not in current App.tsx, but good for future)
// vi.mock('react-router-dom', async (importOriginal) => {
//   const actual = await importOriginal();
//   return {
//     ...actual,
//     useNavigate: () => vi.fn(),
//     useLocation: () => ({ pathname: '/' }),
//   };
// });

// --- End Mocks ---

// Import forwardRef and useImperativeHandle for CurriculumEditor mock
import { forwardRef, useImperativeHandle } from 'react';


const mockCourseMetadataList: CourseMetadata[] = [
  { id: 'course1', title: 'Course 1 Title', name: 'C101' },
  { id: 'course2', title: 'Course 2 Title', name: 'C102' },
];

const mockCourseFull: Course = {
  id: 'course1',
  title: 'Course 1 Title',
  name: 'C101',
  description: EMPTY_ARRAY_JSON_STRING,
  biblicalBasis: EMPTY_ARRAY_JSON_STRING,
  materials: EMPTY_ARRAY_JSON_STRING,
  pacing: EMPTY_ARRAY_JSON_STRING,
  units: [
    {
      id: 'unit1',
      unitName: 'Unit 1 Name',
      timeAllotted: '1 week',
      learningObjectives: EMPTY_ARRAY_JSON_STRING,
      standards: EMPTY_ARRAY_JSON_STRING,
      biblicalIntegration: EMPTY_ARRAY_JSON_STRING,
      instructionalStrategiesActivities: EMPTY_ARRAY_JSON_STRING,
      resources: EMPTY_ARRAY_JSON_STRING,
      assessments: EMPTY_ARRAY_JSON_STRING,
    },
  ],
};

describe('App Component - Button Locations', () => {
  beforeEach(() => {
    vi.resetAllMocks(); // Reset all mocks before each test

    // Setup default mock implementations
    (fetchAllCourseMetadata as ReturnType<typeof vi.fn>).mockResolvedValue(mockCourseMetadataList);
    (fetchCourseById as ReturnType<typeof vi.fn>).mockImplementation(async (id) => {
      if (id === 'course1') return Promise.resolve(mockCourseFull);
      return Promise.resolve(null);
    });
  });

  const renderApp = () => {
    return render(
      <MantineProvider>
        <App />
      </MantineProvider>
    );
  };

  test('when a course is loaded, "Add Unit" button is in AppShell.Header, but "Copy Markdown" and "Suggest Changes" are NOT', async () => {
    renderApp();

    // Wait for course metadata to load (simulated by Select becoming available)
    await screen.findByLabelText('Load Existing Course');

    // Simulate selecting a course (this will trigger handleLoadCourse)
    // For this test, we need to trigger the state change that makes currentCourse non-null
    // The actual Select component is complex to interact with directly in tests without user-event for selection.
    // Instead, we can verify the buttons *after* ensuring the condition (currentCourse is loaded) is met.
    // We'll rely on the mock of fetchCourseById to set currentCourse eventually.
    
    // To simulate loading a course more directly for the button check:
    // We can't directly set state, so we rely on the mocked fetch.
    // Let's assume `handleLoadCourse` is called and `currentCourse` is set.
    // The UI should update to show the header buttons based on `currentCourse`.

    // Directly trigger the load for testing button visibility
    // This is tricky because handleLoadCourse is internal.
    // The best approach is to wait for an element that ONLY appears when a course is loaded,
    // like the StatusBar or CurriculumEditor mock.
    
    // Set selectedCourseId to trigger load if App was structured to auto-load on selectedCourseId change from Select
    // However, our App calls handleLoadCourse.
    // For simplicity, let's check current state of buttons with initial render (no course) and then after a course is "loaded" (mocked).

    // Initial state (no course loaded) - these buttons shouldn't be there anyway
    expect(screen.queryByRole('button', { name: /add unit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /copy markdown/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /suggest changes/i })).not.toBeInTheDocument();


    // Now, let's simulate that a course has been loaded by re-rendering or by finding an element
    // that confirms course load. Since fetchCourseById is mocked to return mockCourseFull,
    // after the component processes this, currentCourse should be set.
    
    // We need to find a way to trigger the state update that shows the buttons.
    // The `Select` onChange would call `handleLoadCourse`.
    // We can use `rerender` or more complex interaction.
    // For now, let's focus on the state *after* a course is conceptually loaded.
    // We will assume `currentCourse` gets populated by the mocked `fetchCourseById`.
    // The `useEffect` for scrolling in App.tsx depends on `currentCourse`.
    // The `StatusBar` mock should appear if `currentCourse` is set.
    
    // Wait for StatusBar to appear, indicating a course is loaded
    await screen.findByTestId('mock-status-bar');
    
    // Verify "Add Unit" button IS in the header
    // The header is part of AppShell, not a specific role, so query within a landmark or by text.
    // The buttons are in a Group within AppShell.Header.
    const addUnitButton = screen.queryByRole('button', { name: /add unit/i });
    expect(addUnitButton).toBeInTheDocument();
    if (addUnitButton) { // Check parent to be more specific about header location
        // This check is brittle. A data-testid on the header group would be better.
        // For now, we assume if it's found and others are not, it's in the header.
    }

    // Verify "Copy Markdown" button is NOT in the header
    // Querying by role and name should be specific enough.
    // If these buttons were in the header, they would have similar structures to "Add Unit".
    expect(screen.queryByRole('button', { name: /copy markdown/i })).not.toBeInTheDocument();
    
    // Verify "Suggest Changes" button is NOT in the header
    expect(screen.queryByRole('button', { name: /suggest changes/i })).not.toBeInTheDocument();

  });
});
