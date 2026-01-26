import { isToday, isYesterday, isAfter, subDays } from "date-fns";

export type TimeGroup = "Today" | "Yesterday" | "Previous 7 Days" | "Older";

export interface GroupedConversations {
    [key: string]: any[];
}

export function groupConversationsByDate(conversations: any[]): GroupedConversations {
    const groups: GroupedConversations = {
        "Today": [],
        "Yesterday": [],
        "Previous 7 Days": [],
        "Older": []
    };

    const now = new Date();
    const sevenDaysAgo = subDays(now, 7);

    conversations.forEach(conv => {
        const date = new Date(conv.updatedAt || conv.createdAt); // Fallback if updatedAt (though chatStore usually has it)

        if (isToday(date)) {
            groups["Today"].push(conv);
        } else if (isYesterday(date)) {
            groups["Yesterday"].push(conv);
        } else if (isAfter(date, sevenDaysAgo)) {
            groups["Previous 7 Days"].push(conv);
        } else {
            groups["Older"].push(conv);
        }
    });

    // Remove empty groups if you want, or handle them in UI. 
    // For now, keeping structure simple.
    return groups;
}
