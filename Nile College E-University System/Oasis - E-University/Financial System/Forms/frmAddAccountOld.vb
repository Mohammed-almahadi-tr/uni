Imports System.Data.SqlClient

Public Class frmAddAccountOld

    Public Level As Integer
    Public Acc1, Acc2, Acc3, Acc4, Acc5, AccountName As String
    Public Saved As Boolean

    Private Sub Button2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button2.Click
        Me.Close()
    End Sub

    Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click
        Me.ErrorProvider1.Clear()
        Try
            Me.Cursor = Cursors.WaitCursor
            If Me.txtAccName.Text.Trim.Length = 0 Then
                MsgBox("Please Enter The Account Name ")
            Else
                Dim StrIns As String

                Select Case Level
                    Case 0
                        StrIns = "Insert Into Acc1 (Acc1) Values (N'" & Me.txtAccName.Text & "')"
                    Case 1
                        StrIns = "Insert Into Acc1 (Acc1,Acc2) Values (N'" & Acc1 & "',N'" & Me.txtAccName.Text & "')"
                    Case 2
                        StrIns = "Insert Into Acc1 (Acc1,Acc2,Acc3) Values (N'" & Acc1 & "',N'" & Acc2 & "',N'" & Me.txtAccName.Text & "')"
                    Case 3
                        StrIns = "Insert Into Acc1 (Acc1,Acc2,Acc3,Acc4) Values (N'" & Acc1 & _
                                 "',N'" & Acc2 & "',N'" & Acc3 & "',N'" & Me.txtAccName.Text & "')"
                    Case 4
                        StrIns = "Insert Into Acc1 (Acc1,Acc2,Acc3,Acc4,Acc5) Values (N'" & Acc1 & _
                                                         "',N'" & Acc2 & "',N'" & Acc3 & "',N'" & Acc4 & "',N'" & Me.txtAccName.Text & "')"
                End Select

                Dim cmd As New SqlCommand(StrIns, cnn)

                cnn.Open()
                cmd.ExecuteNonQuery()
                cnn.Close()

                AccountName = Me.txtAccName.Text
                Saved = True
                Me.Cursor = Cursors.Default
                Me.Close()

                'FillTree()
            End If
            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub

    Private Sub frmAddAccount_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
        Saved = False
    End Sub
End Class