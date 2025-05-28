// src/components/StatusBar/StatusBar.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MantineProvider } from '@mantine/core';
import StatusBar from './StatusBar';
import type { Course } from '../../types';
import { isRichTextEmpty } from '../../utils/completionUtils';

// Mock the isRichTextEmpty utility
jest.mock('../../utils/completionUtils');
const mockedIsRichTextEmpty = isRichTextEmpty as jest.MockedFunction<typeof isRichTextEmpty>;

// A wrapper to provide Mantine theme context, essential for Mantine components
const AllTheProviders: React.FC<{children: React.ReactNode}> = ({ children }) => {
  return (
    <MantineProvider>
      {children}
    </MantineProvider>
  );
};

const renderWithProviders = (ui: React.ReactElement, options?: any) =>
  render(ui, { wrapper: AllTheProviders, ...options });


describe('StatusBar', () => {
  const baseMockCourse: Course = {
    id: 'course1',
    title: 'Test Course',
    name: 'COURSE101',
    description: 'Course description',
    biblicalBasis: 'Biblical basis content',
    materials: 'Materials content',
    pacing: 'Pacing details',
    units: [
      {
        id: 'unit1',
        unitName: 'Test Unit 1',
        timeAllotted: '1 week',
        learningObjectives: 'Objectives for Unit 1',
        standards: 'Standards for Unit 1',
        biblicalIntegration: 'Integration for Unit 1',
        instructionalStrategiesActivities: 'Strategies for Unit 1',
        resources: 'Resources for Unit 1',
        assessments: 'Assessments for Unit 1',
      },
      {
        id: 'unit2',
        unitName: 'Test Unit 2',
        timeAllotted: '2 weeks',
        learningObjectives: 'Objectives for Unit 2',
        standards: 'Standards for Unit 2',
        biblicalIntegration: 'Integration for Unit 2',
        instructionalStrategiesActivities: 'Strategies for Unit 2',
        resources: 'Resources for Unit 2',
        assessments: 'Assessments for Unit 2',
      },
    ],
  };

  // Total sections from baseMockCourse:
  // Course level: title, name, description, biblicalBasis, materials, pacing (6)
  // Unit 1: unitName, learningObjectives, standards, biblicalIntegration, instructionalStrategiesActivities, resources, assessments (7)
  // Unit 2: unitName, learningObjectives, standards, biblicalIntegration, instructionalStrategiesActivities, resources, assessments (7)
  // Total = 6 + 7 + 7 = 20 sections

  beforeEach(() => {
    // Reset mocks before each test
    mockedIsRichTextEmpty.mockReset();
  });

  test('renders null if no course is provided', () => {
    const { container } = renderWithProviders(<StatusBar currentCourse={null} />);
    expect(container.firstChild).toBeNull();
  });

  test('course with all sections empty', () => {
    mockedIsRichTextEmpty.mockReturnValue(true); // All rich text fields are empty
    const emptyCourse: Course = {
      ...baseMockCourse,
      title: '', // plain text empty
      name: '  ', // plain text effectively empty
      description: '[]', 
      biblicalBasis: '[]',
      materials: '[]',
      pacing: '[]',
      units: [
        { ...baseMockCourse.units[0], unitName: '', learningObjectives: '[]', standards: '[]', biblicalIntegration: '[]', instructionalStrategiesActivities: '[]', resources: '[]', assessments: '[]' },
        { ...baseMockCourse.units[1], unitName: ' ', learningObjectives: '[]', standards: '[]', biblicalIntegration: '[]', instructionalStrategiesActivities: '[]', resources: '[]', assessments: '[]' },
      ],
    };
    renderWithProviders(<StatusBar currentCourse={emptyCourse} />);
    expect(screen.getByText('20 section(s) need attention.')).toBeInTheDocument();
    expect(screen.getByText('0 / 20 sections considered complete.')).toBeInTheDocument();
    // Check for progress bar attributes
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '0');
    // Color check is tricky without deeper theme knowledge or visual regression.
    // We can check for the presence of the progress bar.
    expect(progressBar).toBeInTheDocument();
  });

  test('course with some sections complete', () => {
    let callCount = 0;
    mockedIsRichTextEmpty.mockImplementation(() => {
      callCount++;
      // Make first 2 rich text fields non-empty, rest empty
      // Course: description, biblicalBasis (non-empty) = 2
      // Unit 1: learningObjectives (non-empty) = 1
      // Total rich text fields: 4 (course) + 2*6 (units) = 16
      // Mocking 3 rich text as non-empty
      return callCount > 3; 
    });

    const partiallyCompleteCourse: Course = {
      ...baseMockCourse,
      title: 'Full Title', // complete (1)
      name: 'COURSE101',    // complete (1)
      // description: uses mock (non-empty) (1)
      // biblicalBasis: uses mock (non-empty) (1)
      // materials: uses mock (non-empty) (1)
      pacing: '[]', // uses mock (empty)
      units: [
        { ...baseMockCourse.units[0], 
          unitName: 'Unit 1 Name', // complete (1)
          // learningObjectives: uses mock (empty)
          standards: '[]', // uses mock (empty)
          // ... rest use mock (empty)
        },
        { ...baseMockCourse.units[1], 
          unitName: '', // empty
          // ... all rich text use mock (empty)
        },
      ],
    };
    // Completed: title, name, description, biblicalBasis, materials, Unit1.unitName = 6
    // Total = 20
    renderWithProviders(<StatusBar currentCourse={partiallyCompleteCourse} />);
    expect(screen.getByText('14 section(s) need attention.')).toBeInTheDocument();
    expect(screen.getByText('6 / 20 sections considered complete.')).toBeInTheDocument();
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '30'); // 6/20 * 100 = 30
  });

  test('course with all sections complete', () => {
    mockedIsRichTextEmpty.mockReturnValue(false); // All rich text fields are non-empty
    const fullCourse: Course = { ...baseMockCourse }; // Assuming baseMockCourse has non-empty plain text for titles/names
    
    renderWithProviders(<StatusBar currentCourse={fullCourse} />);
    expect(screen.getByText('All 20 sections look complete!')).toBeInTheDocument();
    expect(screen.getByText('20 / 20 sections considered complete.')).toBeInTheDocument();
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '100');
  });

  test('course with no trackable units (only course-level fields)', () => {
    mockedIsRichTextEmpty.mockReturnValue(true); // All rich text empty
    const courseOnly: Course = {
      id: 'course-only',
      title: '',
      name: '',
      description: '[]',
      biblicalBasis: '[]',
      materials: '[]',
      pacing: '[]',
      units: [], // No units
    };
    // Total sections: title, name, description, biblicalBasis, materials, pacing (6)
    renderWithProviders(<StatusBar currentCourse={courseOnly} />);
    expect(screen.getByText('6 section(s) need attention.')).toBeInTheDocument();
    expect(screen.getByText('0 / 6 sections considered complete.')).toBeInTheDocument();
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '0');
  });
  
  test('course with one unit, all complete', () => {
    mockedIsRichTextEmpty.mockReturnValue(false);
    const oneUnitCourse: Course = {
        id: 'one-unit-course',
        title: 'Course Title',
        name: 'C101',
        description: 'desc',
        biblicalBasis: 'bb',
        materials: 'mat',
        pacing: 'pace',
        units: [{
            id: 'u1',
            unitName: 'Unit 1',
            timeAllotted: '1w',
            learningObjectives: 'obj',
            standards: 'std',
            biblicalIntegration: 'bi',
            instructionalStrategiesActivities: 'isa',
            resources: 'res',
            assessments: 'ass',
        }]
    };
    // Total: 6 (course) + 7 (unit) = 13 sections
    renderWithProviders(<StatusBar currentCourse={oneUnitCourse} />);
    expect(screen.getByText('All 13 sections look complete!')).toBeInTheDocument();
    expect(screen.getByText('13 / 13 sections considered complete.')).toBeInTheDocument();
  });

});
