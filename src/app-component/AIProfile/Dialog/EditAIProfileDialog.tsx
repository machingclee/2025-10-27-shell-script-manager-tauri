import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AIProfileDTO } from "@/types/dto";
import { useState, useEffect } from "react";

export const EditAIProfileDialog = (props: {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    profile: AIProfileDTO | null;
    onSave: (profile: AIProfileDTO) => void;
}) => {
    const { isOpen, setIsOpen, profile, onSave } = props;

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");

    useEffect(() => {
        if (profile) {
            setName(profile.name);
            setDescription(profile.description);
        }
    }, [profile]);

    const handleSave = () => {
        if (profile) {
            onSave({
                ...profile,
                name,
                description,
            });
            setIsOpen(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent
                overlayClassName="bg-black/50 z-[9999]"
                onClick={(e) => e.stopPropagation()}
                onDoubleClick={(e) => e.stopPropagation()}
                className="bg-white text-black dark:bg-neutral-800 dark:text-white dark:border-neutral-700 z-[10000]"
            >
                <DialogHeader>
                    <DialogTitle>Edit AI Profile</DialogTitle>
                    <DialogDescription>Update the profile information.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="profile-name">Name</Label>
                        <Input
                            id="profile-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Profile name"
                            className="bg-[rgba(0,0,0,0.05)] border-[rgba(0,0,0,0.1)] dark:bg-[rgba(255,255,255,0.05)] dark:border-[rgba(255,255,255,0.1)] dark:text-white"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="profile-description">Description</Label>
                        <Textarea
                            id="profile-description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Profile description"
                            rows={4}
                            className="bg-[rgba(0,0,0,0.05)] border-[rgba(0,0,0,0.1)] dark:bg-[rgba(255,255,255,0.05)] dark:border-[rgba(255,255,255,0.1)] dark:text-white resize-none"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => setIsOpen(false)}
                        className="bg-[rgba(0,0,0,0.05)] hover:bg-[rgba(0,0,0,0.1)] dark:bg-[rgba(255,255,255,0.05)] dark:hover:bg-[rgba(255,255,255,0.1)] dark:text-white"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={!name.trim()}
                        className="bg-[rgba(0,0,0,0.05)] hover:bg-[rgba(0,0,0,0.1)] dark:bg-[rgba(255,255,255,0.05)] dark:hover:bg-[rgba(255,255,255,0.1)] dark:text-white"
                    >
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
