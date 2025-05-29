// src/components/StatusBar/StatusBar.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import StatusBar from './StatusBar';
import type { Course } from '../../types';
import { EMPTY_ARRAY_JSON_STRING } from '../../utils/constants';

// Mock the isRichTextEmpty utility
vi.mock('../../utils/completionUtils', () => ({
  isRichTextEmpty: vi.fn(),
}));
import { isRichTextEmpty } from '../../utils/completionUtils';


const mockCourseEmpty: Course = {
  id: '1',
  title: '',
  name: '',
  description: EMPTY_ARRAY_JSON_STRING,
  biblicalBasis: EMPTY_ARRAY_JSON_STRING,
  materials: EMPTY_ARRAY_JSON_STRING,
  pacing: EMPTY_ARRAY_JSON_STRING,
  units: [],
};

const mockCoursePartial: Course = {
  id: '2',
  title: 'Partial Course Title', // Plain text, non-empty
  name: 'PAR101', // Plain text, non-empty
  description: 'Some description content', // Rich text, will be mocked as non-empty
  biblicalBasis: EMPTY_ARRAY_JSON_STRING, // Rich text, will be mocked as empty
  materials: 'Some materials content', // Rich text, will be mocked as non-empty
  pacing: EMPTY_ARRAY_JSON_STRING, // Rich text, will be mocked as empty
  units: [
    {
      id: 'unit1_partial',
      unitName: 'Unit 1 Partial', // Plain text, non-empty
      timeAllotted: '1 Week', // Plain text, non-empty (though not part of progress calc in this version)
      learningObjectives: 'Some objectives content', // Rich, mocked non-empty
      standards: EMPTY_ARRAY_JSON_STRING, // Rich, mocked empty
      biblicalIntegration: 'Some integration content', // Rich, mocked non-empty
      instructionalStrategiesActivities: EMPTY_ARRAY_JSON_STRING, // Rich, mocked empty
      resources: 'Some resources content', // Rich, mocked non-empty
      assessments: EMPTY_ARRAY_JSON_STRING, // Rich, mocked empty
    },
    {
      id: 'unit2_full',
      unitName: 'Unit 2 Full', // Plain text, non-empty
      timeAllotted: '2 Weeks', // Plain text, non-empty (not part of progress)
      learningObjectives: 'Full objectives content', // Rich, mocked non-empty
      standards: 'Full standards content', // Rich, mocked non-empty
      biblicalIntegration: 'Full integration content', // Rich, mocked non-empty
      instructionalStrategiesActivities: 'Full activities content', // Rich, mocked non-empty
      resources: 'Full resources content', // Rich, mocked non-empty
      assessments: 'Full assessments content', // Rich, mocked non-empty
    },
  ],
};

const mockCourseFull: Course = {
  id: '3',
  title: 'Full Course Title', // Plain
  name: 'FULL202', // Plain
  description: 'Full description content', // Rich
  biblicalBasis: 'Full biblical basis content', // Rich
  materials: 'Full materials content', // Rich
  pacing: 'Full pacing guide content', // Rich
  units: [
    {
      id: 'unit3_full_course',
      unitName: 'Unit 3 of Full Course', // Plain
      timeAllotted: '3 Weeks', // Plain (not part of progress)
      learningObjectives: 'Covered content', // Rich
      standards: 'Covered content', // Rich
      biblicalIntegration: 'Covered content', // Rich
      instructionalStrategiesActivities: 'Covered content', // Rich
      resources: 'Covered content', // Rich
      assessments: 'Covered content', // Rich
    },
  ],
};


describe('StatusBar Component', () => {
  beforeEach(() => {
    // Reset mocks before each test
    (isRichTextEmpty as ReturnType<typeof vi.fn>).mockReset();
  });

  const renderWithProvider = (component: React.ReactElement) => {
    return render(<MantineProvider>{component}</MantineProvider>);
  };

  test('renders null when currentCourse is null', () => {
    const { container } = renderWithProvider(<StatusBar currentCourse={null} />);
    expect(container.firstChild).toBeNull();
  });

  describe('Overall Course Progress', () => {
    // Overall course fields: title, name (plain text); description, biblicalBasis, materials, pacing (rich text)
    // Total: 2 plain + 4 rich = 6 fields
    test('renders title and correct progress for an empty course', () => {
      (isRichTextEmpty as ReturnType<typeof vi.fn>).mockReturnValue(true); // All rich text is empty
      renderWithProvider(<StatusBar currentCourse={mockCourseEmpty} />);
      
      expect(screen.getByText('Overall Course Progress')).toBeInTheDocument();
      // mockCourseEmpty: title='', name='' (2 empty plain) + 4 rich (mocked empty) = 0/6
      expect(screen.getByText('0%')).toBeInTheDocument();
      expect(screen.getByText('0 / 6 sections complete')).toBeInTheDocument(); 
    });

    test('renders correct progress when some course fields are filled', () => {
      // mockCoursePartial: title, name (2 filled plain)
      // description, materials (2 rich, mocked non-empty)
      // biblicalBasis, pacing (2 rich, mocked empty)
      // Total filled = 2 plain + 2 rich = 4. Total fields = 6.
      (isRichTextEmpty as ReturnType<typeof vi.fn>).mockImplementation(value => {
        if (value === mockCoursePartial.description || value === mockCoursePartial.materials) return false; 
        return true; // biblicalBasis, pacing are considered empty
      });

      renderWithProvider(<StatusBar currentCourse={mockCoursePartial} />);
      expect(screen.getByText('Overall Course Progress')).toBeInTheDocument();
      expect(screen.getByText('67%')).toBeInTheDocument(); // Math.round((4/6)*100)
      expect(screen.getByText('4 / 6 sections complete')).toBeInTheDocument();
    });

    test('renders 100% when all course fields are filled', () => {
      (isRichTextEmpty as ReturnType<typeof vi.fn>).mockReturnValue(false); // All rich text is non-empty
      // mockCourseFull: title, name (2 filled plain) + 4 rich (mocked non-empty) = 6/6
      renderWithProvider(<StatusBar currentCourse={mockCourseFull} />);
      expect(screen.getByText('Overall Course Progress')).toBeInTheDocument();
      expect(screen.getByText('100%')).toBeInTheDocument();
      expect(screen.getByText('6 / 6 sections complete')).toBeInTheDocument();
    });
  });

  describe('Unit Progress', () => {
    // Unit fields: unitName (plain text); learningObjectives, standards, biblicalIntegration, 
    // instructionalStrategiesActivities, resources, assessments (rich text)
    // Total: 1 plain + 6 rich = 7 fields per unit.
    test('renders unit progress title and individual unit progress', () => {
        (isRichTextEmpty as ReturnType<typeof vi.fn>).mockImplementation(value => {
            // Course level (consistent with previous test for mockCoursePartial)
            if (value === mockCoursePartial.description || value === mockCoursePartial.materials) return false;
            if (value === mockCoursePartial.biblicalBasis || value === mockCoursePartial.pacing) return true;
            
            const unit1 = mockCoursePartial.units![0];
            // Unit 1 (Partial): unitName (plain, filled=1)
            // Rich: learningObjectives, biblicalIntegration, resources (mocked non-empty=3)
            // Rich: standards, instructionalStrategiesActivities, assessments (mocked empty=0)
            // Total for Unit 1 = 1 + 3 = 4 filled / 7 total.
            if (value === unit1.learningObjectives || value === unit1.biblicalIntegration || value === unit1.resources) return false;
            if (value === unit1.standards || value === unit1.instructionalStrategiesActivities || value === unit1.assessments) return true;

            const unit2 = mockCoursePartial.units![1];
            // Unit 2 (Full): unitName (plain, filled=1)
            // All 6 rich text fields (mocked non-empty=6)
            // Total for Unit 2 = 1 + 6 = 7 filled / 7 total.
            if ([unit2.learningObjectives, unit2.standards, unit2.biblicalIntegration, unit2.instructionalStrategiesActivities, unit2.resources, unit2.assessments].includes(value as string)) return false;
            
            return true; // Default for any other unhandled rich text (should not happen in this test)
        });

      renderWithProvider(<StatusBar currentCourse={mockCoursePartial} />);
      expect(screen.getByText('Unit Progress')).toBeInTheDocument();

      // Unit 1: Partial (4 / 7 fields)
      expect(screen.getByText('Unit 1 Partial')).toBeInTheDocument();
      expect(screen.getByText('57%')).toBeInTheDocument(); // Math.round((4/7)*100)
      const unit1ProgressText = screen.getAllByText('4 / 7').find(el => el.closest('div')?.textContent?.includes('Unit 1 Partial'));
      expect(unit1ProgressText).toBeInTheDocument();

      // Unit 2: Full (7 / 7 fields)
      expect(screen.getByText('Unit 2 Full')).toBeInTheDocument();
      const all100PercentElements = screen.getAllByText('100%'); // Overall can also be 100% in some scenarios
      const unit2_100Percent = all100PercentElements.find(el => el.closest('div')?.textContent?.includes('Unit 2 Full'));
      expect(unit2_100Percent).toBeInTheDocument();
      
      const unit2ProgressText = screen.getAllByText('7 / 7').find(el => el.closest('div')?.textContent?.includes('Unit 2 Full'));
      expect(unit2ProgressText).toBeInTheDocument();
    });

    test('does not render unit progress section if no units exist', () => {
      (isRichTextEmpty as ReturnType<typeof vi.fn>).mockReturnValue(true); // All rich text empty
      renderWithProvider(<StatusBar currentCourse={mockCourseEmpty} />); // mockCourseEmpty has no units
      expect(screen.queryByText('Unit Progress')).not.toBeInTheDocument();
    });
  });

  describe('Completion Logic Specifics (Overall Course context)', () => {
    // Base for a course with all rich text fields empty, and 'name' plain text field empty.
    // We will vary 'title' (plain) and 'description' (rich).
    // Total 6 overall fields.
    const baseCourseForLogicTest: Course = {
        id: 'logicTest1',
        name: '', // plain, empty
        biblicalBasis: EMPTY_ARRAY_JSON_STRING, // rich, empty by mock default
        materials: EMPTY_ARRAY_JSON_STRING, // rich, empty by mock default
        pacing: EMPTY_ARRAY_JSON_STRING, // rich, empty by mock default
        units: [],
        // Fields to be set by each test:
        title: '', 
        description: EMPTY_ARRAY_JSON_STRING,
    };

    test('rich text field (description) considered empty by mock', () => {
      (isRichTextEmpty as ReturnType<typeof vi.fn>).mockImplementation((value) => {
        // If value is EMPTY_ARRAY_JSON_STRING or specifically the 'description_empty_content', it's empty.
        return value === EMPTY_ARRAY_JSON_STRING || value === 'description_empty_content';
      });
      const testCourse: Course = { ...baseCourseForLogicTest, title: '', description: 'description_empty_content' };
      renderWithProvider(<StatusBar currentCourse={testCourse} />);
      // title (plain empty), name (plain empty)
      // description (rich mocked empty), biblicalBasis/materials/pacing (rich mocked empty)
      // Expected: 0 / 6 complete
      expect(screen.getByText('0%')).toBeInTheDocument();
      expect(screen.getByText('0 / 6 sections complete')).toBeInTheDocument();
    });

    test('rich text field (description) considered non-empty by mock', () => {
      (isRichTextEmpty as ReturnType<typeof vi.fn>).mockImplementation((value) => {
        // Only 'description_filled_content' is non-empty. All others are empty.
        return value !== 'description_filled_content'; 
      });
      const testCourse: Course = { ...baseCourseForLogicTest, title: '', description: 'description_filled_content' };
      renderWithProvider(<StatusBar currentCourse={testCourse} />);
      // title (plain empty), name (plain empty)
      // description (rich mocked non-empty = 1), biblicalBasis/materials/pacing (rich mocked empty)
      // Expected: 1 / 6 complete
      expect(screen.getByText('17%')).toBeInTheDocument(); // Math.round(1/6 * 100)
      expect(screen.getByText('1 / 6 sections complete')).toBeInTheDocument();
    });

    test('plain text field (title) is empty (whitespace)', () => {
      (isRichTextEmpty as ReturnType<typeof vi.fn>).mockReturnValue(true); // all rich text fields are empty
      const testCourse: Course = { ...baseCourseForLogicTest, title: '  ', description: EMPTY_ARRAY_JSON_STRING };
      renderWithProvider(<StatusBar currentCourse={testCourse} />);
      // title (plain empty due to whitespace), name (plain empty)
      // all rich text fields mocked as empty
      // Expected: 0 / 6 complete
      expect(screen.getByText('0%')).toBeInTheDocument();
      expect(screen.getByText('0 / 6 sections complete')).toBeInTheDocument();
    });

    test('plain text field (title) is filled', () => {
      (isRichTextEmpty as ReturnType<typeof vi.fn>).mockReturnValue(true); // all rich text fields are empty
      const testCourse: Course = { ...baseCourseForLogicTest, title: 'Actual Title', description: EMPTY_ARRAY_JSON_STRING };
      renderWithProvider(<StatusBar currentCourse={testCourse} />);
      // title (plain filled = 1), name (plain empty)
      // all rich text fields mocked as empty
      // Expected: 1 / 6 complete
      expect(screen.getByText('17%')).toBeInTheDocument();
      expect(screen.getByText('1 / 6 sections complete')).toBeInTheDocument();
    });
  });

  // Test RingProgress rendering presence by checking for their percentage labels.
  describe('RingProgress Rendering Check', () => {
    beforeEach(() => {
        (isRichTextEmpty as ReturnType<typeof vi.fn>).mockReset();
    });
    const renderWithProvider = (component: React.ReactElement) => {
        return render(<MantineProvider>{component}</MantineProvider>);
    };

    test('RingProgress labels are rendered for overall progress and units', () => {
        // Use mockCoursePartial, which has defined progress for overall and units
        (isRichTextEmpty as ReturnType<typeof vi.fn>).mockImplementation(value => {
            if (value === mockCoursePartial.description || value === mockCoursePartial.materials) return false;
            if (value === mockCoursePartial.biblicalBasis || value === mockCoursePartial.pacing) return true;
            const unit1 = mockCoursePartial.units![0];
            if (value === unit1.learningObjectives || value === unit1.biblicalIntegration || value === unit1.resources) return false;
            if (value === unit1.standards || value === unit1.instructionalStrategiesActivities || value === unit1.assessments) return true;
            const unit2 = mockCoursePartial.units![1];
            if ([unit2.learningObjectives, unit2.standards, unit2.biblicalIntegration, unit2.instructionalStrategiesActivities, unit2.resources, unit2.assessments].includes(value as string)) return false;
            return true;
        });
        renderWithProvider(<StatusBar currentCourse={mockCoursePartial} />);
        
        // Overall progress: 4/6 = 67%
        expect(screen.getByText('67%')).toBeInTheDocument(); 

        // Unit 1 progress: 4/7 = 57%
        expect(screen.getByText('57%')).toBeInTheDocument(); 

        // Unit 2 progress: 7/7 = 100%
        // Need to find the specific 100% tied to Unit 2
        const unit2ProgressContainer = screen.getByText('Unit 2 Full').closest('div');
        expect(unit2ProgressContainer).toHaveTextContent('100%');
    });
  });
});
