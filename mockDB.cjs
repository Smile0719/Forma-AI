// Mock in-memory database for development without MongoDB.
class MockDB {
  constructor() {
    this.data = {
      dynamicforms: [],
      revisions: [],
      drafts: [],
      users: [],
      auditlogs: []
    };
    this.idCounter = 1;
  }

  generateId() {
    return String(this.idCounter++);
  }

  getCollection(name) {
    const key = String(name).toLowerCase();
    if (!this.data[key]) {
      this.data[key] = [];
    }
    return this.data[key];
  }

  matchesQuery(doc, query = {}) {
    if (!query || typeof query !== 'object' || Array.isArray(query)) {
      return true;
    }

    return Object.entries(query).every(([key, expected]) => {
      if (expected && typeof expected === 'object' && !Array.isArray(expected) && !('$in' in expected)) {
        return doc[key] === expected;
      }
      if (expected && typeof expected === 'object' && !Array.isArray(expected) && '$in' in expected) {
        return expected.$in.includes(doc[key]);
      }
      return doc[key] === expected;
    });
  }

  sortRecords(records, sortSpec = {}) {
    const entries = Object.entries(sortSpec || {});
    if (!entries.length) return [...records];

    const [field, direction] = entries[0];
    const dir = Number(direction) >= 0 ? 1 : -1;

    return [...records].sort((a, b) => {
      const left = a[field];
      const right = b[field];
      if (left === right) return 0;
      if (left == null) return 1;
      if (right == null) return -1;
      if (typeof left === 'number' && typeof right === 'number') {
        return (left - right) * dir;
      }
      return String(left).localeCompare(String(right)) * dir;
    });
  }

  buildQuery(records, mode = 'many') {
    let current = [...records];
    const api = {
      sort: (sortSpec = {}) => {
        current = this.sortRecords(current, sortSpec);
        return api;
      },
      limit: (limitCount) => {
        current = current.slice(0, Number(limitCount));
        return api;
      },
      exec: () => Promise.resolve(mode === 'one' ? current[0] ?? null : current),
      then: (onFulfilled, onRejected) => api.exec().then(onFulfilled, onRejected)
    };
    return api;
  }

  async create(collectionName, data = {}) {
    const collection = this.getCollection(collectionName);
    const doc = {
      _id: data._id || this.generateId(),
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    collection.push(doc);
    return doc;
  }

  find(collectionName, query = {}) {
    const collection = this.getCollection(collectionName);
    const matches = collection.filter((doc) => this.matchesQuery(doc, query));
    return this.buildQuery(matches, 'many');
  }

  findOne(collectionName, query = {}) {
    const collection = this.getCollection(collectionName);
    const matches = collection.filter((doc) => this.matchesQuery(doc, query));
    return this.buildQuery(matches, 'one');
  }

  async findById(collectionName, id) {
    const collection = this.getCollection(collectionName);
    return collection.find((doc) => String(doc._id) === String(id)) ?? null;
  }

  async countDocuments(collectionName, query = {}) {
    const collection = this.getCollection(collectionName);
    return collection.filter((doc) => this.matchesQuery(doc, query)).length;
  }

  async findByIdAndUpdate(collectionName, id, update = {}, options = {}) {
    const collection = this.getCollection(collectionName);
    const index = collection.findIndex((doc) => String(doc._id) === String(id));
    if (index === -1) {
      if (options.upsert) {
        const created = await this.create(collectionName, { _id: String(id), ...update });
        return created;
      }
      return null;
    }

    const current = collection[index];
    Object.assign(current, update, { updatedAt: new Date() });
    return current;
  }

  async findOneAndUpdate(collectionName, query = {}, update = {}, options = {}) {
    const collection = this.getCollection(collectionName);
    const match = collection.find((doc) => this.matchesQuery(doc, query));
    if (!match) {
      if (options.upsert) {
        const created = await this.create(collectionName, { ...update, ...query });
        return created;
      }
      return null;
    }

    Object.assign(match, update, { updatedAt: new Date() });
    return match;
  }

  async insertMany(collectionName, docs = []) {
    return Promise.all(docs.map((doc) => this.create(collectionName, doc)));
  }

  async findOneAndDelete(collectionName, query = {}) {
    const collection = this.getCollection(collectionName);
    const index = collection.findIndex((doc) => this.matchesQuery(doc, query));
    if (index === -1) return null;
    const [removed] = collection.splice(index, 1);
    return removed;
  }
}

module.exports = new MockDB();
