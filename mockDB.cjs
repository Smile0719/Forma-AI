// Mock in-memory database for development without MongoDB
class MockDB {
  constructor() {
    this.data = {
      dynamicforms: [],
      drafts: []
    };
    this.id_counter = 1;
  }

  generateId() {
    return (this.id_counter++).toString();
  }

  // DynamicForm operations
  async createForm(data) {
    const doc = {
      _id: this.generateId(),
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.data.dynamicforms.push(doc);
    return doc;
  }

  async findFormById(id) {
    return this.data.dynamicforms.find(f => f._id === id);
  }

  async updateForm(id, updates) {
    const form = this.data.dynamicforms.find(f => f._id === id);
    if (!form) return null;
    Object.assign(form, updates, { updatedAt: new Date() });
    return form;
  }

  // Draft operations
  async findDraft(schemaId) {
    return this.data.drafts.find(d => d.schemaId === schemaId);
  }

  async upsertDraft(schemaId, values) {
    let draft = this.data.drafts.find(d => d.schemaId === schemaId);
    if (!draft) {
      draft = { schemaId, values, savedAt: new Date(), _id: this.generateId() };
      this.data.drafts.push(draft);
    } else {
      draft.values = values;
      draft.savedAt = new Date();
    }
    return draft;
  }
}

module.exports = new MockDB();
