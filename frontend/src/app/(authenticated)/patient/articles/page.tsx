'use client'

import { useState } from 'react'
import { Plus, Edit, Trash2 } from 'lucide-react'

type Article = {
  id: number
  title: string
  content: string
  date: string
  author: string
  userId: string
}

export default function PatientArticles() {
  const [articles, setArticles] = useState<Article[]>([
    { id: 1, title: 'My Journey with Migraine Diagnosis', content: 'After months of recurring headaches with visual aura, I finally got a proper diagnosis. The AI chatbot helped me understand my symptoms before my doctor\'s appointment.', date: 'Apr 15, 2026', author: 'Omar Hesham', userId: 'omar' },
    { id: 2, title: 'How AI Helped Me Read My MRI Report', content: 'The U-Net segmentation and Grad-CAM heatmaps made it so much easier to understand where the radiologist was focusing.', date: 'Apr 10, 2026', author: 'Sarah Ahmed', userId: 'sarah' },
    { id: 3, title: 'Recovery After Brain Surgery', content: 'Thanks to Dr. Sara and CuraVision, my recovery has been smooth. The platform\'s report system kept me informed every step of the way.', date: 'Apr 5, 2026', author: 'John Doe', userId: 'john' },
  ])
  const [showWriteModal, setShowWriteModal] = useState(false)
  const [editingArticle, setEditingArticle] = useState<Article | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  const currentUser = 'omar'

  const handleSaveArticle = () => {
    if (!title.trim() || !content.trim()) return
    
    if (editingArticle) {
      setArticles(articles.map(a => a.id === editingArticle.id ? { ...a, title, content, date: new Date().toLocaleDateString() } : a))
    } else {
      setArticles([{ id: Date.now(), title, content, date: new Date().toLocaleDateString(), author: 'Omar Hesham', userId: currentUser }, ...articles])
    }
    setShowWriteModal(false)
    setEditingArticle(null)
    setTitle('')
    setContent('')
  }

  const handleEdit = (article: Article) => {
    setEditingArticle(article)
    setTitle(article.title)
    setContent(article.content)
    setShowWriteModal(true)
  }

  const handleDelete = (id: number) => {
    if (confirm('Delete this article?')) {
      setArticles(articles.filter(a => a.id !== id))
    }
  }

  return (
    <>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-extrabold mb-1">Community Articles</h2>
          <p className="text-sm text-muted">Read stories from other patients, share your experience</p>
        </div>
        <button onClick={() => { setEditingArticle(null); setTitle(''); setContent(''); setShowWriteModal(true); }} className="px-4 py-2 rounded-lg bg-accent text-[#050B18] text-sm font-bold hover:bg-[#00ddd4] transition flex items-center gap-2">
          <Plus size={14} /> Write Article
        </button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {articles.map((article) => (
          <div key={article.id} className="bg-card border border-border rounded-xl overflow-hidden hover:border-accent transition">
            <div className="p-4">
              <h3 className="font-semibold text-base mb-2 line-clamp-2">{article.title}</h3>
              <div className="flex items-center gap-3 text-xs text-muted mb-2">
                <span>📅 {article.date}</span>
                <span>✍️ {article.author}</span>
              </div>
              <p className="text-sm text-muted leading-relaxed line-clamp-3">{article.content}</p>
            </div>
            {article.userId === currentUser && (
              <div className="border-t border-border p-3 flex gap-2">
                <button onClick={() => handleEdit(article)} className="flex-1 px-3 py-1.5 rounded-lg bg-blue/10 text-blue text-xs font-semibold hover:bg-blue/20 transition flex items-center justify-center gap-1">
                  <Edit size={12} /> Edit
                </button>
                <button onClick={() => handleDelete(article.id)} className="flex-1 px-3 py-1.5 rounded-lg bg-warn/10 text-warn text-xs font-semibold hover:bg-warn/20 transition flex items-center justify-center gap-1">
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Write/Edit Modal */}
      {showWriteModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowWriteModal(false)}>
          <div className="bg-card border border-border rounded-xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-2">{editingArticle ? 'Edit Article' : 'Write New Article'}</h3>
            <p className="text-sm text-muted mb-4">Share your health journey with the community</p>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-11 px-4 rounded-lg bg-surface border border-border text-sm mb-3 focus:outline-none focus:border-accent"
              placeholder="Article title"
            />
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              className="w-full px-4 py-3 rounded-lg bg-surface border border-border text-sm resize-none mb-4 focus:outline-none focus:border-accent"
              placeholder="Write your story..."
            />
            <div className="flex gap-3">
              <button onClick={() => setShowWriteModal(false)} className="flex-1 px-4 py-2 rounded-lg border border-border text-sm text-muted hover:text-white transition">Cancel</button>
              <button onClick={handleSaveArticle} className="flex-1 px-4 py-2 rounded-lg bg-accent text-[#050B18] text-sm font-bold hover:bg-[#00ddd4] transition">{editingArticle ? 'Update' : 'Post'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}