Imports System.Data.SqlClient

Public Class frmAdd_Nationality

    Sub FillList()
        Try
            Me.Cursor = Cursors.WaitCursor

            Dim cmd As New SqlCommand("Select Nationality From Nationalites where Nationality Is Not Null", cnn)
            Dim Reader As SqlDataReader

            Me.ListNationality.Items.Clear()

            cnn.Open()
            Reader = cmd.ExecuteReader
            While Reader.Read
                With Me.ListNationality.Items.Add(Reader.Item(0))
                End With
            End While
            cnn.Close()

            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub

    Private Sub btnSave_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles btnSave.Click
        Try
            If Me.txtCategory.Text.Trim.Length = 0 Then
                Exit Sub
            End If

            Me.Cursor = Cursors.WaitCursor
            Dim cmd As New SqlCommand("Insert Into Nationalites (Nationality) Values(N'" & Me.txtCategory.Text.Trim & "')", cnn)

            cnn.Open()
            cmd.ExecuteNonQuery()
            cnn.Close()

            FillList()

            Me.txtCategory.Clear()
            Me.txtCategory.Focus()

            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub

    Private Sub frmAdd_Nationality_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
        FillList()
    End Sub

    Private Sub btnRemove_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles btnRemove.Click
        If Me.ListNationality.SelectedItems.Count > 0 Then
            If MsgBox("Confirm delete?", MsgBoxStyle.YesNo) = MsgBoxResult.Yes Then
                Try
                    Me.Cursor = Cursors.WaitCursor
                    Dim cmd As New SqlCommand("Delete From Nationalites Where Nationality=N'" & Me.ListNationality.SelectedItems(0).Text & "'", cnn)

                    cnn.Open()
                    cmd.ExecuteNonQuery()
                    cnn.Close()

                    FillList()

                    Me.Cursor = Cursors.Default
                Catch ex As Exception
                    Me.Cursor = Cursors.Default
                    If cnn.State = ConnectionState.Open Then
                        cnn.Close()
                    End If
                    MsgBox(ex.ToString)
                End Try
            End If
        End If
    End Sub
End Class