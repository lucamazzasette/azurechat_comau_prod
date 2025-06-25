"use client";

/**
 * Service for generating starter prompts based on persona personality
 */

export interface StarterPrompt {
  id: string;
  text: string;
  category: string;
}

/**
 * Generate 3 contextually relevant starter prompts based on persona message
 */
export const generateStarterPrompts = (personaMessage: string, personaName: string): string[] => {
  try {
    const message = personaMessage.toLowerCase();
    const prompts: string[] = [];
    
    // Analyze persona message to determine specialization
    const specializations = analyzePersonaSpecialization(message);
    
    if (specializations.includes('marketing')) {
      prompts.push(
        "Create a marketing strategy for my business",
        "Help me analyze my target audience",
        "Design a social media campaign concept"
      );
    } else if (specializations.includes('programming') || specializations.includes('technical')) {
      prompts.push(
        "Help me review and improve my code",
        "Explain a programming concept I'm struggling with",
        "Debug an issue I'm having with my project"
      );
    } else if (specializations.includes('writing') || specializations.includes('content')) {
      prompts.push(
        "Help me improve my writing style",
        "Create content ideas for my blog",
        "Review and edit my draft"
      );
    } else if (specializations.includes('business')) {
      prompts.push(
        "Analyze my business strategy",
        "Help me with market research",
        "Create a business plan outline"
      );
    } else if (specializations.includes('design')) {
      prompts.push(
        "Give me design inspiration and ideas",
        "Review my design concept",
        "Help me choose colors and typography"
      );
    } else if (specializations.includes('education') || specializations.includes('teaching')) {
      prompts.push(
        "Explain a complex topic in simple terms",
        "Create a learning plan for me",
        "Help me understand key concepts"
      );
    } else if (specializations.includes('finance')) {
      prompts.push(
        "Help me create a financial plan",
        "Analyze my investment options",
        "Explain financial concepts"
      );
    } else if (specializations.includes('health') || specializations.includes('wellness')) {
      prompts.push(
        "Give me health and wellness tips",
        "Create a fitness routine",
        "Help me with nutrition advice"
      );
    } else if (specializations.includes('research') || specializations.includes('analysis')) {
      prompts.push(
        "Help me research a topic thoroughly",
        "Analyze data and trends",
        "Find reliable sources and information"
      );
    } else if (specializations.includes('creative') || specializations.includes('art')) {
      prompts.push(
        "Give me creative inspiration",
        "Help me brainstorm new ideas",
        "Provide feedback on my creative work"
      );
    } else {
      // Generic prompts based on common persona patterns
      if (message.includes('expert') || message.includes('specialist')) {
        prompts.push(
          `What are your top recommendations for ${extractMainTopic(message)}?`,
          `Help me solve a challenging problem`,
          `Share your expertise and insights`
        );
      } else if (message.includes('assistant') || message.includes('helper')) {
        prompts.push(
          "What can you help me accomplish today?",
          "Guide me through a step-by-step process",
          "Answer my questions and provide clarity"
        );
      } else if (message.includes('coach') || message.includes('mentor')) {
        prompts.push(
          "Help me set and achieve my goals",
          "Give me motivation and guidance",
          "Provide feedback on my progress"
        );
      } else {
        // Fallback to very generic prompts
        prompts.push(
          "Tell me what you can help me with",
          "Let's start working on something together",
          "Give me your best advice and insights"
        );
      }
    }
    
    // Ensure we have exactly 3 prompts
    if (prompts.length < 3) {
      const fallbackPrompts = [
        "What would you recommend I start with?",
        "Help me understand your capabilities",
        "Let's begin with something interesting"
      ];
      
      // Fill remaining slots with fallback prompts
      while (prompts.length < 3 && fallbackPrompts.length > 0) {
        const fallback = fallbackPrompts.shift();
        if (fallback && !prompts.includes(fallback)) {
          prompts.push(fallback);
        }
      }
    }
    
    // Return first 3 prompts
    return prompts.slice(0, 3);
    
  } catch (error) {
    console.warn('Error generating starter prompts:', error);
    
    // Fallback prompts if generation fails
    return [
      "Tell me about yourself and what you can do",
      "What can you help me with today?",
      "Let's get started with something interesting"
    ];
  }
};

/**
 * Analyze persona message to determine specializations
 */
const analyzePersonaSpecialization = (message: string): string[] => {
  const specializations: string[] = [];
  
  // Marketing indicators
  if (message.includes('marketing') || message.includes('campaign') || message.includes('brand') || message.includes('social media')) {
    specializations.push('marketing');
  }
  
  // Programming/Technical indicators
  if (message.includes('programming') || message.includes('coding') || message.includes('development') || 
      message.includes('software') || message.includes('technical') || message.includes('engineer')) {
    specializations.push('programming', 'technical');
  }
  
  // Writing/Content indicators
  if (message.includes('writing') || message.includes('content') || message.includes('blog') || 
      message.includes('copywriting') || message.includes('editorial')) {
    specializations.push('writing', 'content');
  }
  
  // Business indicators
  if (message.includes('business') || message.includes('strategy') || message.includes('entrepreneur') || 
      message.includes('management') || message.includes('consulting')) {
    specializations.push('business');
  }
  
  // Design indicators
  if (message.includes('design') || message.includes('creative') || message.includes('visual') || 
      message.includes('ui') || message.includes('ux') || message.includes('graphic')) {
    specializations.push('design', 'creative');
  }
  
  // Education indicators
  if (message.includes('education') || message.includes('teaching') || message.includes('tutor') || 
      message.includes('learning') || message.includes('instructor')) {
    specializations.push('education', 'teaching');
  }
  
  // Finance indicators
  if (message.includes('finance') || message.includes('financial') || message.includes('investment') || 
      message.includes('money') || message.includes('budget')) {
    specializations.push('finance');
  }
  
  // Health/Wellness indicators
  if (message.includes('health') || message.includes('wellness') || message.includes('fitness') || 
      message.includes('medical') || message.includes('nutrition')) {
    specializations.push('health', 'wellness');
  }
  
  // Research/Analysis indicators
  if (message.includes('research') || message.includes('analysis') || message.includes('data') || 
      message.includes('analyst') || message.includes('investigate')) {
    specializations.push('research', 'analysis');
  }
  
  return specializations;
};

/**
 * Extract main topic from persona message for generic prompts
 */
const extractMainTopic = (message: string): string => {
  // Try to find the main subject/topic in the persona message
  const words = message.split(/\s+/);
  const topicWords = words.filter(word => 
    word.length > 4 && 
    !['expert', 'specialist', 'assistant', 'helper', 'that', 'this', 'with', 'your', 'will', 'help'].includes(word.toLowerCase())
  );
  
  if (topicWords.length > 0) {
    return topicWords[0];
  }
  
  return 'your area of expertise';
};

/**
 * Validate and ensure prompts meet quality standards
 */
export const validateStarterPrompts = (prompts: string[]): boolean => {
  if (!Array.isArray(prompts) || prompts.length !== 3) {
    return false;
  }
  
  return prompts.every(prompt => 
    typeof prompt === 'string' && 
    prompt.trim().length > 5 && 
    prompt.trim().length < 100
  );
};
