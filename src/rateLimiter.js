(function(AG){
  if(!AG.rateLimiting){ AG.rateLimiting = {}; }
  const utils = (AG.utils)||{};

  class BurstRateLimiter {
    constructor(options = {}) {
      const cfg = AG.constants.CONFIG;
      this.threshold = options.threshold || cfg.RATE_LIMIT_THRESHOLD;
      this.recoveryTime = options.recoveryTime || cfg.RATE_LIMIT_RECOVERY;
      this.safetyMargin = options.safetyMargin || cfg.RATE_LIMIT_SAFETY_MARGIN;
      this.intraBurstDelay = options.intraBurstDelay || cfg.INTRA_BURST_DELAY;
      this.maxRequestsPerMinute = options.maxRequestsPerMinute || cfg.MAX_REQUESTS_PER_MINUTE;
      this.smartBurstSize = cfg.SMART_BURST_SIZE;
      this.mode = cfg.RATE_LIMIT_MODE || 'normal';
      this.requestTimestamps = [];
      this.lastRateLimitTime = 0;
      this.dynamicBurstSize = this.calculateInitialBurstSize();
  // Parity stats
  this.rateLimitHits = 0;
  this.totalCalls = 0;
  this.successfulBursts = 0;
  this.currentBurstCount = 0;
  // Monolith-style burst tracking (for throttle parity)
  this._burstStart = 0;
  this._burstCalls = 0;
    }
    calculateInitialBurstSize(){
      return Math.max(3, Math.floor(this.maxRequestsPerMinute / 4));
    }
    adjustBurstSize(){
      if(!this.smartBurstSize) return;
      const now = Date.now();
      const recent = this.requestTimestamps.filter(ts => now - ts < 60000); // last 60s
      const usageRatio = recent.length / this.maxRequestsPerMinute;
      if(usageRatio < 0.3) this.dynamicBurstSize = Math.min(this.dynamicBurstSize + 1, 10);
      else if(usageRatio > 0.8) this.dynamicBurstSize = Math.max(2, this.dynamicBurstSize - 1);
    }
    async schedule(tasks){
      const results = [];
      let batch = [];
      for(const task of tasks){
        batch.push(task);
        if(batch.length >= this.dynamicBurstSize){
          const r = await this.executeBatch(batch);
          results.push(...r);
          batch = [];
          this.adjustBurstSize();
        }
      }
      if(batch.length){
        const r = await this.executeBatch(batch);
        results.push(...r);
      }
      return results;
    }
    async executeBatch(batch){
      const now = Date.now();
      this.pruneOldRequests(now);
      if(this.isRateLimited(now)){
        const waitTime = this.recoveryTime;
        console.log(`[AG][rateLimiter] Rate limited. Waiting ${waitTime}ms`);
        await utils.sleep ? utils.sleep(waitTime) : new Promise(r=>setTimeout(r, waitTime));
        this.lastRateLimitTime = Date.now();
        this.rateLimitHits++;
      }
      const results = [];
      this.currentBurstCount = 0;
      for(const fn of batch){
        try{
          const res = await fn();
          results.push({status:'fulfilled', value: res});
        }catch(err){
          results.push({status:'rejected', reason: err});
        }
        this.requestTimestamps.push(Date.now());
        this.totalCalls++;
        this.currentBurstCount++;
        if(this.intraBurstDelay){
          await (utils.sleep ? utils.sleep(this.intraBurstDelay) : new Promise(r=>setTimeout(r,this.intraBurstDelay)));
        }
      }
      this.successfulBursts++;
      return results;
    }
    isRateLimited(now){
      const recent = this.requestTimestamps.filter(ts => now - ts < 60000);
      return recent.length >= (this.threshold * this.safetyMargin);
    }
    pruneOldRequests(now){
      this.requestTimestamps = this.requestTimestamps.filter(ts => now - ts < 60000);
    }
    getStats(){
      const now = Date.now();
      this.pruneOldRequests(now);
      const recent = this.requestTimestamps.filter(ts => now - ts < 60000);
      return {
        requestsPerMinute: recent.length,
        currentBurstCount: this.currentBurstCount,
        burstLimit: this.threshold,
        totalCalls: this.totalCalls,
        rateLimitHits: this.rateLimitHits,
        successfulBursts: this.successfulBursts,
        recoveryTime: this.recoveryTime,
        intraBurstDelay: this.intraBurstDelay,
        dynamicBurstSize: this.dynamicBurstSize,
        mode: this.mode
      };
    }
    adaptToBurstLimit(){
      // Placeholder adaptation: adjust dynamicBurstSize based on rateLimitHits ratio
      const stats = this.getStats();
      if(stats.rateLimitHits>2 && this.dynamicBurstSize>2){ this.dynamicBurstSize--; }
      else if(stats.requestsPerMinute < this.maxRequestsPerMinute*0.5 && this.dynamicBurstSize < 12){ this.dynamicBurstSize++; }
      return this.dynamicBurstSize;
    }
    // Added for monolith parity: single-call throttle used by API module
    async throttle(){
      const now = Date.now();
      this.pruneOldRequests(now);
      // Start new burst if needed
      if(!this._burstStart || (now - this._burstStart) > this.recoveryTime){
        if(this._burstCalls>0) this.successfulBursts++; // completed previous burst
        this._burstStart = now;
        this._burstCalls = 0;
        this.currentBurstCount = 0;
      }
      // Hard per‑minute limiting (conservative)
      const recent = this.requestTimestamps.filter(ts => now - ts < 60000);
      if(recent.length >= (this.maxRequestsPerMinute * 0.95)){ // pre-empt at 95%
        const wait = 1000; // brief backoff
        console.log(`[AG][rateLimiter] Pre-emptive wait ${wait}ms (RPM=${recent.length})`);
        await (utils.sleep? utils.sleep(wait): new Promise(r=>setTimeout(r,wait)));
      }
      // Burst threshold check with safety margin
      if(this._burstCalls >= Math.min(this.dynamicBurstSize, this.threshold)){
        const elapsed = now - this._burstStart;
        if(elapsed < this.recoveryTime){
          const waitTime = this.recoveryTime - elapsed;
          console.log(`[AG][rateLimiter] Burst pause ${waitTime}ms (${this._burstCalls}/${this.dynamicBurstSize})`);
          await (utils.sleep? utils.sleep(waitTime): new Promise(r=>setTimeout(r,waitTime)));
        }
        this._burstStart = Date.now();
        this._burstCalls = 0;
        this.currentBurstCount = 0;
      }
      // Rate limit guard (simple safety)
      if(this.isRateLimited(now)){
        const waitTime = this.recoveryTime;
        console.log(`[AG][rateLimiter] Rate limited. Waiting ${waitTime}ms`);
        await (utils.sleep? utils.sleep(waitTime): new Promise(r=>setTimeout(r,waitTime)));
        this.lastRateLimitTime = Date.now();
        this.rateLimitHits++;
        this._burstStart = Date.now();
        this._burstCalls = 0;
        this.currentBurstCount = 0;
      }
      // Intra-burst spacing
      if(this.intraBurstDelay){
        const lastTs = this.requestTimestamps[this.requestTimestamps.length-1];
        if(lastTs){
          const gap = Date.now() - lastTs;
          if(gap < this.intraBurstDelay){
            await (utils.sleep? utils.sleep(this.intraBurstDelay-gap): new Promise(r=>setTimeout(r,this.intraBurstDelay-gap)));
          }
        }
      }
      // Record call
      this.requestTimestamps.push(Date.now());
      this.totalCalls++;
      this._burstCalls++;
      this.currentBurstCount = this._burstCalls;
    }
  }

  class APIRateLimiter {
    constructor(delay){
      const cfg = AG.constants.CONFIG;
      this.delay = delay || cfg.REQUEST_DELAY || 1000;
      this.last = 0;
    }
    async wait(){
      const now = Date.now();
      const diff = now - this.last;
      if(diff < this.delay){
        const toWait = this.delay - diff;
        await (utils.sleep ? utils.sleep(toWait) : new Promise(r=>setTimeout(r,toWait)));
      }
      this.last = Date.now();
    }
    async wrap(fn){
      await this.wait();
      return fn();
    }
  }

  AG.rateLimiting.BurstRateLimiter = BurstRateLimiter;
  AG.rateLimiting.APIRateLimiter = APIRateLimiter;
  AG.rateLimiting.MODULE_VERSION = 'rateLimiter-1.0';
  console.log('[AG][rateLimiter] Loaded');
})(window.AG = window.AG || {});
