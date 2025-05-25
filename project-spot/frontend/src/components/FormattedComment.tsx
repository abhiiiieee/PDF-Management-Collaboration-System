import React from 'react';
import { Typography, Box } from '@mui/material';

interface FormattedCommentProps {
  text: string;
}

const FormattedComment: React.FC<FormattedCommentProps> = ({ text }) => {
  // Function to format text with markdown-like syntax
  const formatText = (text: string) => {
    let formattedText = text;
    
    // Replace markdown with HTML
    
    // Process bullet lists first
    const bulletListRegex = /^[\s]*•\s(.+)$/gm;
    if (bulletListRegex.test(formattedText)) {
      const bulletListMatches = formattedText.match(bulletListRegex);
      if (bulletListMatches) {
        const listItems = bulletListMatches.map(item => 
          `<li>${item.replace(/^[\s]*•\s/, '')}</li>`
        ).join('');
        formattedText = formattedText.replace(bulletListRegex, match => 
          `<ul style="margin:0;padding-left:20px">${listItems}</ul>`
        );
      }
    }
    
    // Process numbered lists
    const numberedListRegex = /^[\s]*(\d+)\.\s(.+)$/gm;
    if (numberedListRegex.test(formattedText)) {
      const numberedListMatches = formattedText.match(numberedListRegex);
      if (numberedListMatches) {
        const listItems = numberedListMatches.map(item => 
          `<li>${item.replace(/^[\s]*\d+\.\s/, '')}</li>`
        ).join('');
        formattedText = formattedText.replace(numberedListRegex, match => 
          `<ol style="margin:0;padding-left:20px">${listItems}</ol>`
        );
      }
    }
    
    // Bold
    formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Italic
    formattedText = formattedText.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    return formattedText;
  };
  
  return (
    <Typography 
      variant="body2" 
      component="div"
      sx={{ 
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word'
      }}
      dangerouslySetInnerHTML={{ __html: formatText(text) }}
    />
  );
};

export default FormattedComment; 