import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Drawer, 
  List, 
  ListItem, 
  ListItemText, 
  TextField, 
  Button, 
  IconButton,
  CircularProgress,
  Divider,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  ListItemSecondaryAction,
  Menu,
  MenuItem,
  Avatar
} from '@mui/material';
import { Send as SendIcon, Delete as DeleteIcon, Edit as EditIcon, Reply as ReplyIcon, MoreVert as MoreVertIcon, Close as CloseIcon } from '@mui/icons-material';
import { Document, Page, pdfjs } from 'react-pdf';
import { useParams } from 'react-router-dom';
import { pdfService, commentService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import FormattedComment from './FormattedComment';
import RichTextEditor from './RichTextEditor';

// Set the worker source for react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface Comment {
  _id: string;
  text: string;
  pageNumber: number;
  user?: {
    _id: string;
    name: string;
    email: string;
  };
  guestName?: string;
  guestEmail?: string;
  createdAt: string;
  position?: {
    x: number;
    y: number;
  };
  parentComment?: string;
  replies?: Comment[];
}

interface PdfViewerProps {
  isShared?: boolean;
}

const PdfViewer: React.FC<PdfViewerProps> = ({ isShared = false }) => {
  const { id, shareToken } = useParams<{ id: string; shareToken: string }>();
  const { user } = useAuth();
  
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [drawerWidth, setDrawerWidth] = useState(350);
  const [drawerOpen] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfData, setPdfData] = useState<any>(null);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [editCommentId, setEditCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [guestInfoDialogOpen, setGuestInfoDialogOpen] = useState(false);
  const [tempComment, setTempComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedComment, setSelectedComment] = useState<Comment | null>(null);
  
  const documentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchPdfData = async () => {
      setLoading(true);
      try {
        if (isShared && shareToken) {
          const response = await pdfService.getPdfByShareToken(shareToken);
          setPdfData(response.pdf);
          setPdfUrl(pdfService.getSharedPdfFileUrl(shareToken));
        } else if (id && user) {
          const response = await pdfService.getPdfById(id);
          setPdfData(response.pdf);
          setPdfUrl(pdfService.getPdfFileUrl(id));
        } else {
          setError('Missing PDF ID or share token');
        }
      } catch (error) {
        console.error('Error fetching PDF:', error);
        setError('Failed to load PDF');
      } finally {
        setLoading(false);
      }
    };

    fetchPdfData();
  }, [id, shareToken, isShared, user]);

  useEffect(() => {
    const fetchComments = async () => {
      try {
        let response: { comments: Comment[] };
        if (isShared && shareToken) {
          response = await commentService.getSharedPdfComments(shareToken);
        } else if (id && user) {
          response = await commentService.getPdfComments(id);
        } else {
          return;
        }
        
        // Organize comments and replies
        const comments = response.comments;
        const parentComments: Comment[] = [];
        const replyMap: { [key: string]: Comment[] } = {};
        
        // Group replies by parent comment
        comments.forEach((comment: Comment) => {
          if (comment.parentComment) {
            if (!replyMap[comment.parentComment]) {
              replyMap[comment.parentComment] = [];
            }
            replyMap[comment.parentComment].push(comment);
          } else {
            parentComments.push(comment);
          }
        });
        
        // Attach replies to parent comments
        parentComments.forEach(comment => {
          comment.replies = replyMap[comment._id] || [];
        });
        
        setComments(parentComments);
      } catch (error) {
        console.error('Error fetching comments:', error);
        showNotification('Failed to load comments', 'error');
      }
    };

    if (pdfData) {
      fetchComments();
    }
  }, [pdfData, id, shareToken, isShared, user]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const handlePageChange = (newPageNumber: number) => {
    if (newPageNumber >= 1 && newPageNumber <= (numPages || 1)) {
      setPageNumber(newPageNumber);
    }
  };

  const handleCommentSubmit = async (text: string) => {
    if (!text.trim()) return;
    
    try {
      const commentData = {
        text,
        pageNumber,
        position: { x: 0, y: 0 }, // Default position
        parentComment: replyingTo ? replyingTo._id : undefined
      };
      
      let response: { comment: Comment };
      
      if (isShared && shareToken) {
        // For shared PDFs - guests need to provide name and email
        if (!user && (!guestName || !guestEmail)) {
          setTempComment(text);
          setGuestInfoDialogOpen(true);
          return;
        }
        
        const guestData = !user ? { guestName, guestEmail } : {};
        response = await commentService.addCommentToShared(shareToken, {
          ...commentData,
          ...guestData
        });
      } else if (id && user) {
        response = await commentService.addComment(id, commentData);
      } else {
        showNotification('Cannot add comment', 'error');
        return;
      }
      
      // Add new comment to the state based on whether it's a reply or not
      if (replyingTo) {
        setComments(prevComments => {
          return prevComments.map(comment => {
            if (comment._id === replyingTo._id) {
              const replies = comment.replies || [];
              return {
                ...comment,
                replies: [...replies, response.comment]
              };
            }
            return comment;
          });
        });
        setReplyingTo(null);
      } else {
        // It's a new top-level comment
        const newComment = { ...response.comment, replies: [] };
        setComments(prevComments => [...prevComments, newComment]);
      }
      
      setNewComment('');
      showNotification('Comment added successfully', 'success');
    } catch (error) {
      console.error('Error adding comment:', error);
      showNotification('Failed to add comment', 'error');
    }
  };

  const handleDeleteComment = async (commentId: string, parentId?: string) => {
    try {
      await commentService.deleteComment(commentId);
      
      if (parentId) {
        // Delete a reply
        setComments(prevComments => {
          return prevComments.map(comment => {
            if (comment._id === parentId) {
              return {
                ...comment,
                replies: (comment.replies || []).filter(reply => reply._id !== commentId)
              };
            }
            return comment;
          });
        });
      } else {
        // Delete a top-level comment
        setComments(prevComments => prevComments.filter(comment => comment._id !== commentId));
      }
      
      showNotification('Comment deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting comment:', error);
      showNotification('Failed to delete comment', 'error');
    }
  };

  const handleEditComment = (comment: Comment) => {
    setEditCommentId(comment._id);
    setEditCommentText(comment.text);
  };

  const submitEditComment = async () => {
    if (!editCommentId || !editCommentText.trim()) return;
    
    try {
      await commentService.editComment(editCommentId, editCommentText);
      
      // Update comments state with proper type annotations
      const updateComment = (commentsList: Comment[]): Comment[] => {
        return commentsList.map(comment => {
          if (comment._id === editCommentId) {
            return { ...comment, text: editCommentText };
          }
          
          if (comment.replies) {
            return {
              ...comment,
              replies: updateComment(comment.replies)
            };
          }
          
          return comment;
        });
      };
      
      setComments(prev => updateComment(prev));
      setEditCommentId(null);
      setEditCommentText('');
      showNotification('Comment updated successfully', 'success');
    } catch (error) {
      console.error('Error updating comment:', error);
      showNotification('Failed to update comment', 'error');
    }
  };

  const cancelEditComment = () => {
    setEditCommentId(null);
    setEditCommentText('');
  };

  const handleReplyToComment = (comment: Comment) => {
    setReplyingTo(comment);
    setNewComment(`@${comment.user?.name || comment.guestName || 'User'} `);
    // Focus the comment input
    document.getElementById('comment-input')?.focus();
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setNewComment('');
  };

  const handleCommentMenuOpen = (event: React.MouseEvent<HTMLElement>, comment: Comment) => {
    setMenuAnchorEl(event.currentTarget);
    setSelectedComment(comment);
  };

  const handleCommentMenuClose = () => {
    setMenuAnchorEl(null);
    setSelectedComment(null);
  };

  const handleMenuAction = (action: string) => {
    if (!selectedComment) return;
    
    if (action === 'edit') {
      handleEditComment(selectedComment);
    } else if (action === 'delete') {
      handleDeleteComment(selectedComment._id);
    } else if (action === 'reply') {
      handleReplyToComment(selectedComment);
    }
    
    handleCommentMenuClose();
  };

  const showNotification = (message: string, severity: 'success' | 'error') => {
    setNotification({
      open: true,
      message,
      severity
    });
  };

  const handleCloseNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };

  const submitGuestInfo = async () => {
    if (!guestName || !guestEmail) return;
    
    setGuestInfoDialogOpen(false);
    
    if (tempComment) {
      setNewComment(tempComment);
      handleCommentSubmit(tempComment);
    }
  };

  // Filter comments by current page
  const filteredComments = comments?.filter(comment => comment.pageNumber === pageNumber);

  const renderCommentList = () => {
    if (filteredComments?.length === 0) {
      return (
        <Box py={2} textAlign="center">
          <Typography color="textSecondary">No comments yet</Typography>
        </Box>
      );
    }

    return (
      <List>
        {filteredComments.map(comment => (
          <Box key={comment._id}>
            <ListItem alignItems="flex-start">
              <Box sx={{ width: '100%' }}>
                <Box display="flex" alignItems="center" mb={1}>
                  <Avatar sx={{ mr: 1, width: 32, height: 32, bgcolor: 'primary.main' }}>
                    {(comment.user?.name || comment.guestName || 'U').charAt(0).toUpperCase()}
                  </Avatar>
                  <Typography variant="subtitle2">
                    {comment.user?.name || comment.guestName || 'Anonymous'}
                  </Typography>
                  <Typography variant="caption" color="textSecondary" sx={{ ml: 1 }}>
                    {new Date(comment.createdAt).toLocaleString()}
                  </Typography>
                  <IconButton 
                    size="small" 
                    sx={{ ml: 'auto' }}
                    onClick={(e) => handleCommentMenuOpen(e, comment)}
                  >
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                </Box>
              
                {editCommentId === comment._id ? (
                  <Box mb={1}>
                    <RichTextEditor
                      initialValue={editCommentText}
                      onSubmit={(text) => {
                        setEditCommentText(text);
                        submitEditComment();
                      }}
                      submitButtonText="Save"
                    />
                    <Button onClick={cancelEditComment} size="small" sx={{ mt: 1 }}>
                      Cancel
                    </Button>
                  </Box>
                ) : (
                  <FormattedComment text={comment.text} />
                )}
                
                <Box display="flex" justifyContent="flex-end">
                  <Button
                    startIcon={<ReplyIcon />}
                    size="small"
                    onClick={() => handleReplyToComment(comment)}
                  >
                    Reply
                  </Button>
                </Box>
                
                {/* Render replies */}
                {comment.replies && comment.replies?.length > 0 && (
                  <Box ml={4} mt={1} pl={1} sx={{ borderLeft: '2px solid #eee' }}>
                    <List disablePadding>
                      {comment.replies.map(reply => (
                        <ListItem key={reply._id} alignItems="flex-start" sx={{ py: 1 }}>
                          <Box sx={{ width: '100%' }}>
                            <Box display="flex" alignItems="center" mb={0.5}>
                              <Avatar sx={{ mr: 1, width: 24, height: 24, bgcolor: 'secondary.main' }}>
                                {(reply.user?.name || reply.guestName || 'U').charAt(0).toUpperCase()}
                              </Avatar>
                              <Typography variant="subtitle2" fontSize="0.85rem">
                                {reply.user?.name || reply.guestName || 'Anonymous'}
                              </Typography>
                              <Typography variant="caption" color="textSecondary" sx={{ ml: 1 }}>
                                {new Date(reply.createdAt).toLocaleString()}
                              </Typography>
                              <IconButton 
                                size="small" 
                                sx={{ ml: 'auto' }}
                                onClick={(e) => handleCommentMenuOpen(e, reply)}
                              >
                                <MoreVertIcon fontSize="small" />
                              </IconButton>
                            </Box>
                            
                            {editCommentId === reply._id ? (
                              <Box mb={1}>
                                <RichTextEditor
                                  initialValue={editCommentText}
                                  onSubmit={(text) => {
                                    setEditCommentText(text);
                                    submitEditComment();
                                  }}
                                  submitButtonText="Save"
                                />
                                <Button onClick={cancelEditComment} size="small" sx={{ mt: 1 }}>
                                  Cancel
                                </Button>
                              </Box>
                            ) : (
                              <FormattedComment text={reply.text} />
                            )}
                          </Box>
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}
              </Box>
            </ListItem>
            <Divider />
          </Box>
        ))}
      </List>
    );
  };

  return (
    <Box sx={{ display: 'flex', position: 'relative', height: 'calc(100vh - 160px)' }}>
      {/* Main content area */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="100%">
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : (
          <Box>
            <Typography variant="h5" gutterBottom>
              {pdfData?.filename || 'PDF Viewer'}
            </Typography>
            
            <Paper 
              elevation={3} 
              sx={{ 
                mt: 2, 
                p: 2, 
                maxHeight: 'calc(100vh - 240px)', 
                overflow: 'auto',
                display: 'flex',
                justifyContent: 'center'
              }}
              ref={documentRef}
            >
              {pdfUrl && (
                <Document
                  file={pdfUrl}
                  onLoadSuccess={onDocumentLoadSuccess}
                  loading={<CircularProgress />}
                  error={<Alert severity="error">Failed to load PDF</Alert>}
                >
                  <Page pageNumber={pageNumber} />
                </Document>
              )}
            </Paper>
            
            <Box display="flex" justifyContent="center" alignItems="center" my={2}>
              <Button 
                disabled={pageNumber <= 1} 
                onClick={() => handlePageChange(pageNumber - 1)}
              >
                Previous
              </Button>
              <Typography mx={2}>
                Page {pageNumber} of {numPages || '?'}
              </Typography>
              <Button 
                disabled={pageNumber >= (numPages || 1)} 
                onClick={() => handlePageChange(pageNumber + 1)}
              >
                Next
              </Button>
            </Box>
          </Box>
        )}
      </Box>
      
      {/* Comments panel */}
      <Drawer
        variant="permanent"
        anchor="right"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            position: 'relative',
            height: '100%',
            border: 'none',
            borderLeft: '1px solid rgba(0, 0, 0, 0.12)'
          },
        }}
      >
        <Box sx={{ p: 2, borderBottom: '1px solid rgba(0, 0, 0, 0.12)' }}>
          <Typography variant="h6">Comments</Typography>
          <Typography variant="caption" color="textSecondary">
            Page {pageNumber}
          </Typography>
        </Box>
        
        <Box sx={{ overflow: 'auto', flexGrow: 1 }}>
          {renderCommentList()}
        </Box>
        
        <Box sx={{ p: 2, borderTop: '1px solid rgba(0, 0, 0, 0.12)' }}>
          {replyingTo && (
            <Box 
              sx={{ 
                mb: 1, 
                p: 1, 
                backgroundColor: 'action.hover', 
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <Typography variant="caption" sx={{ flex: 1 }}>
                Replying to {replyingTo.user?.name || replyingTo.guestName || 'User'}
              </Typography>
              <IconButton size="small" onClick={cancelReply}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          )}
          
          <RichTextEditor
            initialValue={newComment}
            onSubmit={handleCommentSubmit}
            submitButtonText={replyingTo ? 'Reply' : 'Comment'}
            placeholder={replyingTo ? 'Write a reply...' : 'Add a comment...'}
          />
        </Box>
      </Drawer>

      {/* Comment menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleCommentMenuClose}
      >
        <MenuItem onClick={() => handleMenuAction('reply')}>
          <ReplyIcon fontSize="small" sx={{ mr: 1 }} />
          Reply
        </MenuItem>
        {(user && selectedComment?.user?._id === user.id) && (
          <>
            <MenuItem onClick={() => handleMenuAction('edit')}>
              <EditIcon fontSize="small" sx={{ mr: 1 }} />
              Edit
            </MenuItem>
            <MenuItem onClick={() => handleMenuAction('delete')}>
              <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
              Delete
            </MenuItem>
          </>
        )}
      </Menu>
      
      {/* Guest info dialog */}
      <Dialog open={guestInfoDialogOpen} onClose={() => setGuestInfoDialogOpen(false)}>
        <DialogTitle>Your Information</DialogTitle>
        <DialogContent>
          <Typography variant="body2" paragraph>
            Please provide your name and email to add a comment
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="Your Name"
            type="text"
            fullWidth
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            required
          />
          <TextField
            margin="dense"
            label="Your Email"
            type="email"
            fullWidth
            value={guestEmail}
            onChange={(e) => setGuestEmail(e.target.value)}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGuestInfoDialogOpen(false)}>Cancel</Button>
          <Button onClick={submitGuestInfo} variant="contained" color="primary">
            Submit
          </Button>
        </DialogActions>
      </Dialog>
      
      <Snackbar 
        open={notification.open} 
        autoHideDuration={6000} 
        onClose={handleCloseNotification}
      >
        <Alert onClose={handleCloseNotification} severity={notification.severity}>
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PdfViewer; 