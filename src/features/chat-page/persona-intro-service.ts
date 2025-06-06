"use client";

import { ChatThreadModel, MESSAGE_ATTRIBUTE } from "./chat-services/models";
import { CHAT_DEFAULT_PERSONA } from "@/features/theme/theme-config";

/**
 * Service for generating persona introduction messages
 */

export interface PersonaIntroMessage {
  id: string;
  content: string;
  role: 'assistant';
  name: string;
  isIntroMessage: true;
}

/**
 * Check if a chat thread should show an introduction message
 */
export const shouldShowPersonaIntro = (
  chatThread: ChatThreadModel, 
  messagesCount: number
): boolean => {
  // Show intro only for new persona chats (no messages yet)
  const isNewChat = messagesCount === 0;
  
  // Check if it has a persona (not default)
  const hasPersona = chatThread.personaMessage.trim() !== "" && 
                    chatThread.personaMessageTitle !== CHAT_DEFAULT_PERSONA &&
                    chatThread.personaMessageTitle.trim() !== "";
  
  return isNewChat && hasPersona;
};

/**
 * Generate AI summary from persona message
 */
const generatePersonalitySummary = (personaMessage: string): string => {
  try {
    // Extract key specializations and capabilities from the persona message
    const message = personaMessage.toLowerCase();
    
    // Common patterns to identify specializations
    const specializations = [];
    
    // Look for expertise indicators
    if (message.includes('expert') || message.includes('specialist')) {
      if (message.includes('marketing')) specializations.push('marketing strategy and campaigns');
      if (message.includes('technical') || message.includes('programming')) specializations.push('technical guidance and programming');
      if (message.includes('writing') || message.includes('content')) specializations.push('writing and content creation');
      if (message.includes('business')) specializations.push('business strategy and analysis');
      if (message.includes('design')) specializations.push('design and creative solutions');
      if (message.includes('research')) specializations.push('research and data analysis');
      if (message.includes('education') || message.includes('teaching')) specializations.push('education and knowledge sharing');
      if (message.includes('finance')) specializations.push('financial planning and analysis');
      if (message.includes('legal')) specializations.push('legal guidance and compliance');
      if (message.includes('healthcare') || message.includes('medical')) specializations.push('healthcare and medical insights');
    }
    
    // Look for specific skills or capabilities
    if (message.includes('help') || message.includes('assist')) {
      if (message.includes('solve')) specializations.push('problem-solving and troubleshooting');
      if (message.includes('explain')) specializations.push('explaining complex concepts');
      if (message.includes('analyze')) specializations.push('analysis and insights');
      if (message.includes('create') || message.includes('generate')) specializations.push('creative solutions and content generation');
      if (message.includes('plan')) specializations.push('planning and strategy development');
    }
    
    // Look for domain-specific terms
    if (message.includes('code') || message.includes('develop')) specializations.push('software development and coding');
    if (message.includes('data')) specializations.push('data analysis and insights');
    if (message.includes('customer')) specializations.push('customer experience and support');
    if (message.includes('project')) specializations.push('project management and coordination');
    
    // If we found specific specializations, use them
    if (specializations.length > 0) {
      // Take up to 2-3 main specializations to keep it concise
      const mainSpecializations = specializations.slice(0, 3);
      return mainSpecializations.join(', ');
    }
    
    // Fallback: try to extract first meaningful sentence or key phrases
    const sentences = personaMessage.split(/[.!?]+/).filter(s => s.trim().length > 10);
    if (sentences.length > 0) {
      let firstSentence = sentences[0].trim();
      // Clean up common system prompt patterns
      firstSentence = firstSentence
        .replace(/^(you are|i am|as an?|the|this)/i, '')
        .replace(/assistant|ai|chatbot|system/gi, '')
        .trim();
      
      if (firstSentence.length > 20 && firstSentence.length < 100) {
        return firstSentence.toLowerCase();
      }
    }
    
    // Final fallback
    return 'providing helpful assistance and insights';
    
  } catch (error) {
    console.warn('Error generating personality summary:', error);
    return 'providing helpful assistance and insights';
  }
};

/**
 * Generate the persona introduction message
 */
export const generatePersonaIntroMessage = (chatThread: ChatThreadModel): PersonaIntroMessage => {
  const personaName = chatThread.personaMessageTitle || "Assistant";
  const personalitySummary = generatePersonalitySummary(chatThread.personaMessage);
  
  // Create the introduction message in first person
  const introContent = `Hello! I am AICO ${personaName}, specialized in ${personalitySummary}. What can I do for you?`;
  
  return {
    id: `intro-${chatThread.id}`,
    content: introContent,
    role: 'assistant',
    name: 'AICO',
    isIntroMessage: true
  };
};

/**
 * Format intro message for display (similar to regular chat messages)
 */
export const formatIntroMessageForChat = (introMessage: PersonaIntroMessage) => {
  return {
    id: introMessage.id,
    content: introMessage.content,
    role: introMessage.role as 'assistant',
    name: introMessage.name,
    // Add required ChatMessageModel fields
    createdAt: new Date(),
    isDeleted: false,
    threadId: '', // Will be virtual, doesn't need real threadId
    userId: '', // Will be virtual, doesn't need real userId
    type: MESSAGE_ATTRIBUTE,
    // Mark as virtual message (not from DB) - for internal use
    isVirtual: true,
    isIntroMessage: true
  };
};
