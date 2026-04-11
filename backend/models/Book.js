// backend/models/Book.js
export class Book {
  constructor(id, title, author, pdfUrl, available) {
    this.id = id;
    this.title = title;
    this.author = author;
    this.pdfUrl = pdfUrl;
    this.available = available; // true ou false
  }
}