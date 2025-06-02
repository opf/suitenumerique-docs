import { fetchAPI } from "@/api";
import { useCallback } from "react";

export const OPENPROJECT_TASK_PROJECT_ID = '1'; // TODO: Replace with your actual project ID
export const OPENPROJECT_TASK_TYPE_ID = '1'; // TODO: Replace with your actual "task" type ID
export const OPENPROJECT_FEATURE_PROJECT_ID = '1';
export const OPENPROJECT_FEATURE_TYPE_ID = '1';

export const UI_BLUE = '#000091'; // Default color for task status icons
export const UI_BEIGE = '#FBF5F2';
export const UI_GRAY = '#3a3a3a';

export const OPENPROJECT_HOST =
    process.env.OPEN_PROJECT_HOST || 'https://openproject.local';

export interface WorkPackage {
    id: string;
    subject: string;
    status?: string | null;
    assignee?: string | null;
    href?: string | null;
    _links?: {
        self: { href: string };
        status: { title: string, color: string } | null;
        assignee: { title: string } | null;
        type: { title: string, color: string } | null;
    } | null;
}



export interface WorkPackageCollection {
    _embedded: {
        elements: WorkPackage[];
    };
}


export const searchWorkPackage = async (searchQuery: string) => {

    try {
        const response = await fetchAPI(
            `op/api/v3/work_packages?filters=[{"typeahead":{"operator":"**","values":["${searchQuery}"]}}]`,
            {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            },
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: WorkPackageCollection = await response.json();

        if (data && data._embedded && data._embedded.elements) {
            return data._embedded.elements;
        } else {
            console.error('Invalid API response:', data);
            return [];
        }
    } catch (error) {
        console.error('Error fetching work packages:', error);
        return [];
    }
};