const ResourceMonitor = require('./ResourceMonitor');

describe('ResourceMonitor', () => {
  let monitor;

  beforeEach(() => {
    monitor = new ResourceMonitor({
      sampleInterval: 100, // Fast sampling for tests
      maxSamples: 5
    });
  });

  afterEach(() => {
    if (monitor) {
      monitor.stop();
    }
  });

  describe('start and stop', () => {
    it('should start monitoring', () => {
      monitor.start();
      expect(monitor.isMonitoring).toBe(true);
    });

    it('should stop monitoring', () => {
      monitor.start();
      monitor.stop();
      expect(monitor.isMonitoring).toBe(false);
    });

    it('should not start twice', () => {
      monitor.start();
      const firstInterval = monitor.monitoringInterval;
      monitor.start();
      expect(monitor.monitoringInterval).toBe(firstInterval);
    });
  });

  describe('sampling', () => {
    it('should take initial sample on start', () => {
      monitor.start();
      expect(monitor.memorySamples.length).toBeGreaterThan(0);
      expect(monitor.cpuSamples.length).toBeGreaterThan(0);
    });

    it('should collect samples over time', async () => {
      monitor.start();
      
      // Wait for a few samples
      await new Promise(resolve => setTimeout(resolve, 300));
      
      expect(monitor.memorySamples.length).toBeGreaterThan(1);
      expect(monitor.cpuSamples.length).toBeGreaterThan(1);
    });

    it('should limit sample history', async () => {
      monitor.start();
      
      // Wait for more than maxSamples
      await new Promise(resolve => setTimeout(resolve, 700));
      
      expect(monitor.memorySamples.length).toBeLessThanOrEqual(5);
      expect(monitor.cpuSamples.length).toBeLessThanOrEqual(5);
    });
  });

  describe('getCurrentMemory', () => {
    it('should return null when no samples', () => {
      expect(monitor.getCurrentMemory()).toBeNull();
    });

    it('should return current memory usage', () => {
      monitor.start();
      
      const memory = monitor.getCurrentMemory();
      expect(memory).toBeDefined();
      expect(memory.rss).toBeGreaterThan(0);
      expect(memory.heapUsed).toBeGreaterThan(0);
      expect(memory.heapTotal).toBeGreaterThan(0);
    });
  });

  describe('getAverageMemory', () => {
    it('should return null when no samples', () => {
      expect(monitor.getAverageMemory()).toBeNull();
    });

    it('should calculate average memory usage', async () => {
      monitor.start();
      
      // Wait for multiple samples
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const avgMemory = monitor.getAverageMemory();
      expect(avgMemory).toBeDefined();
      expect(avgMemory.rss).toBeGreaterThan(0);
      expect(avgMemory.heapUsed).toBeGreaterThan(0);
    });
  });

  describe('getCPUUsage', () => {
    it('should return null when insufficient samples', () => {
      expect(monitor.getCPUUsage()).toBeNull();
    });

    it('should calculate CPU usage', async () => {
      monitor.start();
      
      // Wait for at least 2 samples
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const cpuUsage = monitor.getCPUUsage();
      expect(cpuUsage).toBeDefined();
      expect(cpuUsage).toBeGreaterThanOrEqual(0);
      expect(cpuUsage).toBeLessThanOrEqual(100);
    });
  });

  describe('getAverageCPU', () => {
    it('should return null when insufficient samples', () => {
      expect(monitor.getAverageCPU()).toBeNull();
    });

    it('should calculate average CPU usage', async () => {
      monitor.start();
      
      // Wait for multiple samples
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const avgCPU = monitor.getAverageCPU();
      expect(avgCPU).toBeDefined();
      expect(avgCPU).toBeGreaterThanOrEqual(0);
      expect(avgCPU).toBeLessThanOrEqual(100);
    });
  });

  describe('getSummary', () => {
    it('should return complete summary', async () => {
      monitor.start();
      
      // Wait for samples
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const summary = monitor.getSummary();
      expect(summary).toBeDefined();
      expect(summary.memory).toBeDefined();
      expect(summary.cpu).toBeDefined();
      expect(summary.samples).toBeDefined();
      expect(summary.samples.count).toBeGreaterThan(0);
    });
  });

  describe('checkCompliance', () => {
    it('should check resource compliance', async () => {
      monitor.start();
      
      // Wait for samples
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const compliance = monitor.checkCompliance({
        maxMemoryMB: 100,
        maxCPUPercent: 5
      });
      
      expect(compliance).toBeDefined();
      expect(compliance.compliant).toBeDefined();
      expect(compliance.memory).toBeDefined();
      expect(compliance.cpu).toBeDefined();
    });

    it('should use default limits', async () => {
      monitor.start();
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const compliance = monitor.checkCompliance();
      
      expect(compliance.memory.limit).toBe(100);
      expect(compliance.cpu.limit).toBe(5);
    });
  });

  describe('forceGC', () => {
    it('should call global.gc if available', () => {
      const originalGC = global.gc;
      global.gc = vi.fn();
      
      monitor.forceGC();
      
      expect(global.gc).toHaveBeenCalled();
      
      global.gc = originalGC;
    });

    it('should not throw if gc not available', () => {
      const originalGC = global.gc;
      delete global.gc;
      
      expect(() => monitor.forceGC()).not.toThrow();
      
      global.gc = originalGC;
    });
  });
});
