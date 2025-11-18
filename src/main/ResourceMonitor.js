/**
 * ResourceMonitor - Monitors CPU and memory usage
 */
class ResourceMonitor {
  constructor(options = {}) {
    this.sampleInterval = options.sampleInterval || 5000; // 5 seconds
    this.maxSamples = options.maxSamples || 12; // Keep last 12 samples (1 minute)
    this.cpuSamples = [];
    this.memorySamples = [];
    this.monitoringInterval = null;
    this.isMonitoring = false;
  }

  /**
   * Start monitoring resource usage
   */
  start() {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.cpuSamples = [];
    this.memorySamples = [];

    // Take initial sample
    this._takeSample();

    // Set up periodic sampling
    this.monitoringInterval = setInterval(() => {
      this._takeSample();
    }, this.sampleInterval);

    console.log('Resource monitoring started');
  }

  /**
   * Stop monitoring resource usage
   */
  stop() {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('Resource monitoring stopped');
  }

  /**
   * Take a resource usage sample
   * @private
   */
  _takeSample() {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    // Store memory sample (in MB)
    const memorySample = {
      timestamp: Date.now(),
      rss: memoryUsage.rss / 1024 / 1024, // Resident Set Size
      heapUsed: memoryUsage.heapUsed / 1024 / 1024,
      heapTotal: memoryUsage.heapTotal / 1024 / 1024,
      external: memoryUsage.external / 1024 / 1024
    };

    this.memorySamples.push(memorySample);

    // Store CPU sample
    const cpuSample = {
      timestamp: Date.now(),
      user: cpuUsage.user,
      system: cpuUsage.system
    };

    this.cpuSamples.push(cpuSample);

    // Limit sample history
    if (this.memorySamples.length > this.maxSamples) {
      this.memorySamples.shift();
    }

    if (this.cpuSamples.length > this.maxSamples) {
      this.cpuSamples.shift();
    }
  }

  /**
   * Get current memory usage
   * @returns {Object} - Memory usage in MB
   */
  getCurrentMemory() {
    if (this.memorySamples.length === 0) {
      return null;
    }

    return this.memorySamples[this.memorySamples.length - 1];
  }

  /**
   * Get average memory usage
   * @returns {Object} - Average memory usage in MB
   */
  getAverageMemory() {
    if (this.memorySamples.length === 0) {
      return null;
    }

    const sum = this.memorySamples.reduce((acc, sample) => ({
      rss: acc.rss + sample.rss,
      heapUsed: acc.heapUsed + sample.heapUsed,
      heapTotal: acc.heapTotal + sample.heapTotal,
      external: acc.external + sample.external
    }), { rss: 0, heapUsed: 0, heapTotal: 0, external: 0 });

    const count = this.memorySamples.length;

    return {
      rss: sum.rss / count,
      heapUsed: sum.heapUsed / count,
      heapTotal: sum.heapTotal / count,
      external: sum.external / count
    };
  }

  /**
   * Get CPU usage percentage
   * @returns {number|null} - CPU usage percentage (0-100)
   */
  getCPUUsage() {
    if (this.cpuSamples.length < 2) {
      return null;
    }

    // Calculate CPU usage between last two samples
    const current = this.cpuSamples[this.cpuSamples.length - 1];
    const previous = this.cpuSamples[this.cpuSamples.length - 2];

    const timeDiff = current.timestamp - previous.timestamp;
    const userDiff = current.user - previous.user;
    const systemDiff = current.system - previous.system;

    // Convert microseconds to milliseconds
    const totalCPUTime = (userDiff + systemDiff) / 1000;

    // Calculate percentage (single core)
    const cpuPercent = (totalCPUTime / timeDiff) * 100;

    return Math.min(cpuPercent, 100);
  }

  /**
   * Get average CPU usage
   * @returns {number|null} - Average CPU usage percentage
   */
  getAverageCPU() {
    if (this.cpuSamples.length < 2) {
      return null;
    }

    let totalPercent = 0;
    let count = 0;

    for (let i = 1; i < this.cpuSamples.length; i++) {
      const current = this.cpuSamples[i];
      const previous = this.cpuSamples[i - 1];

      const timeDiff = current.timestamp - previous.timestamp;
      const userDiff = current.user - previous.user;
      const systemDiff = current.system - previous.system;

      const totalCPUTime = (userDiff + systemDiff) / 1000;
      const cpuPercent = (totalCPUTime / timeDiff) * 100;

      totalPercent += Math.min(cpuPercent, 100);
      count++;
    }

    return count > 0 ? totalPercent / count : null;
  }

  /**
   * Get resource usage summary
   * @returns {Object} - Summary of resource usage
   */
  getSummary() {
    return {
      memory: {
        current: this.getCurrentMemory(),
        average: this.getAverageMemory()
      },
      cpu: {
        current: this.getCPUUsage(),
        average: this.getAverageCPU()
      },
      samples: {
        count: this.cpuSamples.length,
        duration: this.cpuSamples.length > 0 
          ? (this.cpuSamples[this.cpuSamples.length - 1].timestamp - this.cpuSamples[0].timestamp) / 1000
          : 0
      }
    };
  }

  /**
   * Check if resource usage is within limits
   * @param {Object} limits - Resource limits
   * @param {number} limits.maxMemoryMB - Maximum memory in MB (default: 100)
   * @param {number} limits.maxCPUPercent - Maximum CPU percentage (default: 5)
   * @returns {Object} - Compliance status
   */
  checkCompliance(limits = {}) {
    const maxMemoryMB = limits.maxMemoryMB || 100;
    const maxCPUPercent = limits.maxCPUPercent || 5;

    const avgMemory = this.getAverageMemory();
    const avgCPU = this.getAverageCPU();

    const memoryCompliant = avgMemory ? avgMemory.rss <= maxMemoryMB : true;
    const cpuCompliant = avgCPU !== null ? avgCPU <= maxCPUPercent : true;

    return {
      compliant: memoryCompliant && cpuCompliant,
      memory: {
        compliant: memoryCompliant,
        current: avgMemory ? avgMemory.rss : null,
        limit: maxMemoryMB
      },
      cpu: {
        compliant: cpuCompliant,
        current: avgCPU,
        limit: maxCPUPercent
      }
    };
  }

  /**
   * Force garbage collection if available
   */
  forceGC() {
    if (global.gc) {
      global.gc();
      console.log('Forced garbage collection');
    }
  }
}

module.exports = ResourceMonitor;
