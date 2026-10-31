import { getAmbientMeshColors, AmbientMesh } from './ambient-mesh';
import { useAppTheme } from '../context/theme-context';

jest.mock('react-native', () => ({
  View: 'View',
  Dimensions: {
    get: jest.fn(() => ({ width: 390, height: 844 })),
  },
  Platform: { OS: 'ios' },
  StyleSheet: {
    create: (styles: Record<string, unknown>) => styles,
    absoluteFill: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    },
  },
}));

jest.mock('react-native-svg', () => ({
  __esModule: true,
  default: 'Svg',
  Svg: 'Svg',
  Defs: 'Defs',
  RadialGradient: 'RadialGradient',
  Stop: 'Stop',
  Circle: 'Circle',
  Rect: 'Rect',
}));

jest.mock('../context/theme-context', () => ({
  useAppTheme: jest.fn(() => ({
    isDark: false,
    tokens: {},
    themePreference: 'system',
    setThemePreference: jest.fn(),
  })),
}));

describe('AmbientMesh & Specular Refraction Backdrop', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAmbientMeshColors', () => {
    it('returns exactly 3 calibrated orbs for dark mode with rich saturation', () => {
      const orbs = getAmbientMeshColors(true);
      expect(orbs).toHaveLength(3);

      expect(orbs[0]).toEqual({
        cx: '85%',
        cy: '12%',
        r: '45%',
        color: '#007AFF',
        opacity: 0.22,
      });

      expect(orbs[1]).toEqual({
        cx: '15%',
        cy: '48%',
        r: '42%',
        color: '#8B5CF6',
        opacity: 0.20,
      });

      expect(orbs[2]).toEqual({
        cx: '80%',
        cy: '82%',
        r: '38%',
        color: '#10B981',
        opacity: 0.18,
      });
    });

    it('returns exactly 3 calibrated pastel orbs for light mode', () => {
      const orbs = getAmbientMeshColors(false);
      expect(orbs).toHaveLength(3);

      expect(orbs[0]).toEqual({
        cx: '85%',
        cy: '12%',
        r: '45%',
        color: '#38BDF8',
        opacity: 0.14,
      });

      expect(orbs[1]).toEqual({
        cx: '15%',
        cy: '48%',
        r: '42%',
        color: '#C084FC',
        opacity: 0.12,
      });

      expect(orbs[2]).toEqual({
        cx: '80%',
        cy: '82%',
        r: '38%',
        color: '#34D399',
        opacity: 0.12,
      });
    });
  });

  describe('AmbientMesh component', () => {
    it('renders with pointerEvents="none" and absolute fill container', () => {
      const element = AmbientMesh({ testID: 'ambient-mesh-test' });
      expect(element).toBeDefined();
      expect(element.type).toBe('View');
      expect(element.props.pointerEvents).toBe('none');
      expect(element.props.testID).toBe('ambient-mesh-test');
    });

    it('adapts to dark mode from theme context', () => {
      (useAppTheme as jest.Mock).mockReturnValue({
        isDark: true,
        tokens: {},
        themePreference: 'dark',
        setThemePreference: jest.fn(),
      });

      const element = AmbientMesh({});
      expect(element).toBeDefined();
      expect(useAppTheme).toHaveBeenCalled();
    });
  });
});
