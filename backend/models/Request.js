// backend/models/Request.js
export class Request {
  constructor(id, userId, title, author, status) {
    this.id = id;
    this.userId = userId;
    this.title = title;
    this.author = author;
    this.status = status; // "en attente", "approuvé", "refusé"
  }
}