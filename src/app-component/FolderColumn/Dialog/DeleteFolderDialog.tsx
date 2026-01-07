import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
    AlertDialogAction,
} from "@/components/ui/alert-dialog";

import { ScriptsFolderResponse } from "@/types/dto";

export const DeleteFolderDialog = (props: {
    isDeleteOpen: boolean;
    setIsDeleteOpen: (open: boolean) => void;
    folder: ScriptsFolderResponse;
    handleDelete: () => void;
}) => {
    const { isDeleteOpen, setIsDeleteOpen, folder, handleDelete } = props;

    return (
        <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
            <AlertDialogContent
                onClick={(e) => e.stopPropagation()}
                onDoubleClick={(e) => e.stopPropagation()}
                className="bg-white text-black dark:bg-neutral-800 dark:text-white dark:border-neutral-700"
            >
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete Folder?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to delete "{folder.name}"? This will also delete all
                        scripts in this folder. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleDelete}
                        className="bg-red-600 hover:bg-red-700"
                    >
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};
